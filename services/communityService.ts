import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { pdfStorage } from './pdfStorage';
import { CommunityShelfExportSchema } from '../types/schemas';
import type { Book, ShelfData, Annotation } from '../types';

export interface CommunityShelfExport {
  version: string;
  exportedAt: string;
  shelfName: string;
  shelfColor?: string;
  userName: string;
  books: Array<{
    id: string;
    title: string;
    author: string;
    cover: string;
    content: string;
    annotations?: Annotation[];
    stars: number;
    lastPage?: number;
    addedAt: number;
  }>;
}

// ─────────────────────────────────────────────────────────
//  JSZIP LAZY LOADER
// ─────────────────────────────────────────────────────────

let _jszip: any = null;
const _loadJSZip = async (): Promise<any> => {
  if (_jszip) return _jszip;
  return new Promise((resolve, reject) => {
    if ((window as any).JSZip) { _jszip = (window as any).JSZip; resolve(_jszip); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    s.onload = () => { _jszip = (window as any).JSZip; resolve(_jszip); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
};

// ─────────────────────────────────────────────────────────
//  MEMORY-SAFE BASE64 UTILITIES
// ─────────────────────────────────────────────────────────

/**
 * Converts a Uint8Array chunk to base64.
 * Designed for SMALL chunks (≤1 MB) to avoid V8 string limits.
 */
const _chunkToB64 = (bytes: Uint8Array): string => {
  const SLICE = 4096;
  let bin = '';
  for (let i = 0; i < bytes.length; i += SLICE) {
    const end = Math.min(i + SLICE, bytes.length);
    for (let j = i; j < end; j++) bin += String.fromCharCode(bytes[j]);
  }
  return btoa(bin);
};

/**
 * Legacy-compatible: converts full Uint8Array to base64 for small payloads.
 * Falls back to chunked write for anything over SAFE_THRESHOLD.
 */
const _u8ToB64 = (bytes: Uint8Array): string => {
  const CHUNK = 4096;
  let b = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const end = Math.min(i + CHUNK, bytes.length);
    for (let j = i; j < end; j++) b += String.fromCharCode(bytes[j]);
  }
  return btoa(b);
};

// Yield control back to the main thread to prevent UI freeze
const _yield = (): Promise<void> => new Promise(r => setTimeout(r, 0));

// ─────────────────────────────────────────────────────────
//  CHUNKED FILESYSTEM WRITER
//  Writes a Uint8Array to Capacitor Filesystem in safe chunks.
//  Avoids the IPC bridge limit and prevents OOM from a single
//  massive base64 string.
// ─────────────────────────────────────────────────────────

const WRITE_CHUNK_SIZE = 512 * 1024; // 512 KB per IPC call — safe for all devices

/**
 * Write a large Uint8Array to the native filesystem in chunked base64 calls.
 * Returns the native file URI.
 */
const _writeChunked = async (
  bytes: Uint8Array,
  filename: string,
  directory: typeof Directory.Cache | typeof Directory.Documents = Directory.Cache
): Promise<string> => {
  // First chunk creates the file
  const firstChunk = bytes.subarray(0, Math.min(WRITE_CHUNK_SIZE, bytes.length));
  const result = await Filesystem.writeFile({
    path: filename,
    data: _chunkToB64(firstChunk),
    directory,
    recursive: true,
  });
  
  // Subsequent chunks append
  for (let offset = WRITE_CHUNK_SIZE; offset < bytes.length; offset += WRITE_CHUNK_SIZE) {
    const end = Math.min(offset + WRITE_CHUNK_SIZE, bytes.length);
    const chunk = bytes.subarray(offset, end);

    await Filesystem.appendFile({
      path: filename,
      data: _chunkToB64(chunk),
      directory,
    });

    // Yield every 2 MB to prevent ANR
    if ((offset / WRITE_CHUNK_SIZE) % 4 === 0) {
      await _yield();
    }
  }

  return result.uri;
};

// ─────────────────────────────────────────────────────────
//  ZIP BUILDER — PROGRESSIVE (memory-bounded)
//  Processes books ONE AT A TIME, releasing ArrayBuffer references
//  between each book to allow GC to reclaim memory.
// ─────────────────────────────────────────────────────────

const _buildZipStreaming = async (
  shelf: ShelfData,
  books: Book[],
  userName: string,
  useStore = false,
): Promise<Uint8Array> => {
  const JSZip = await _loadJSZip();
  const zip = new JSZip();
  const shelfBooks = books.filter(b => b.shelfId === shelf.id);
  const manifestBooks: any[] = [];

  // Process books ONE AT A TIME to bound memory usage to max(single PDF size)
  for (let i = 0; i < shelfBooks.length; i++) {
    const book = shelfBooks[i];
    let cover = book.cover;

    try {
      if (!cover || !cover.startsWith('data:')) {
        const stored = await pdfStorage.getCover(book.id);
        if (stored) cover = stored;
      }
    } catch (e) { /* cover retrieval is non-critical */ }

    try {
      const buf = await pdfStorage.getFile(book.id);
      if (buf) {
        const fileSize = buf.byteLength;
        // For large files or explicitly requested STORE, skip compression to reduce memory
        const forceStore = useStore || fileSize > 10 * 1024 * 1024;
        
        zip.file(`pdfs/${book.id}.pdf`, buf, {
          compression: forceStore ? 'STORE' : 'DEFLATE',
          compressionOptions: forceStore ? undefined : { level: 1 },
        });
      }
    } catch (e) {
      console.error(`ZIP: PDF failed for "${book.title}"`, e);
    }

    manifestBooks.push({
      id: book.id,
      title: book.title,
      author: book.author,
      cover: cover || '',
      annotations: book.annotations || [],
      stars: book.stars || 0,
      lastPage: book.lastPage || 0,
      addedAt: book.addedAt || Date.now(),
    });

    // Yield every 3 books to allow GC and prevent ANR
    if (i % 3 === 2) {
      await _yield();
    }
  }

  zip.file('manifest.json', JSON.stringify({
    version: '2.0.0',
    format: useStore ? 'zip-large' : 'zip',
    exportedAt: new Date().toISOString(),
    shelfName: shelf.name,
    shelfColor: shelf.color,
    userName,
    books: manifestBooks,
  }));

  return zip.generateAsync({
    type: 'uint8array',
    compression: useStore ? 'STORE' : 'DEFLATE',
    compressionOptions: useStore ? undefined : { level: 1 },
    streamFiles: true,
  });
};

// ─────────────────────────────────────────────────────────
//  ZIP IMPORT — PROGRESSIVE (memory-bounded)
//  Extracts PDFs one at a time and saves to IDB immediately,
//  then nullifies the reference so GC can reclaim.
// ─────────────────────────────────────────────────────────

const _importFromZip = async (file: File): Promise<{ shelf: ShelfData; books: Book[] }> => {
  const JSZip = await _loadJSZip();

  // Use the File (Blob) directly — JSZip supports Blob input,
  // which avoids loading the entire file into a separate ArrayBuffer.
  const zip = await JSZip.loadAsync(file);

  const mf = zip.file('manifest.json');
  if (!mf) throw new Error('Invalid shelf file: missing manifest.json');
  const manifest = JSON.parse(await mf.async('string'));

  const shelfId = `shelf_${Date.now()}`;
  const shelf: ShelfData = {
    id: shelfId,
    name: manifest.shelfName,
    color: manifest.shelfColor || '#ff0000',
  };

  const books: Book[] = [];

  for (const bd of (manifest.books || [])) {
    const newId = `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const pdfEntry = zip.file(`pdfs/${bd.id}.pdf`);
      if (pdfEntry) {
        // Extract one PDF at a time — 'arraybuffer' type means we get a single
        // ArrayBuffer which is immediately written to IDB and can be GC'd.
        const pdfBuf: ArrayBuffer = await pdfEntry.async('arraybuffer');
        await pdfStorage.saveFile(newId, pdfBuf);
        // pdfBuf goes out of scope here → eligible for GC
      }
      if (bd.cover?.startsWith('data:image')) {
        await pdfStorage.saveCover(newId, bd.cover);
      }
    } catch (e) {
      console.error(`Import ZIP: failed for "${bd.title}"`, e);
    }

    books.push({
      id: newId, shelfId,
      title: bd.title, author: bd.author,
      cover: bd.cover || '', content: '',
      timeSpentSeconds: 0, dailyTimeSeconds: 0,
      stars: bd.stars || 0,
      addedAt: bd.addedAt || Date.now(),
      lastPage: bd.lastPage,
      annotations: bd.annotations || [],
    });

    // Yield after each book to allow GC to reclaim the extracted PDF buffer
    await _yield();
  }

  return { shelf, books };
};

const _importFromJson = async (
  jsonData: string,
  targetShelfId?: string
): Promise<{ shelf: ShelfData; books: Book[] }> => {
  const data = CommunityShelfExportSchema.parse(JSON.parse(jsonData));
  const shelfId = targetShelfId || `shelf_${Date.now()}`;
  const shelf: ShelfData = { id: shelfId, name: data.shelfName, color: data.shelfColor || '#ff0000' };
  const books: Book[] = [];

  for (const bd of data.books) {
    const newId = `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    if (bd.content?.length) {
      try {
        const bin = atob(bd.content);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        await pdfStorage.saveFile(newId, bytes.buffer);
        if (bd.cover?.startsWith('data:image')) await pdfStorage.saveCover(newId, bd.cover);
      } catch (e) { console.error(`Import JSON: failed for "${bd.title}"`, e); }
    }
    books.push({
      id: newId, shelfId,
      title: bd.title, author: bd.author,
      cover: bd.cover || '', content: '',
      timeSpentSeconds: 0, dailyTimeSeconds: 0,
      stars: bd.stars || 0,
      addedAt: bd.addedAt || Date.now(),
      lastPage: bd.lastPage,
      annotations: bd.annotations || [],
    });
    await _yield();
  }
  return { shelf, books };
};

// ─────────────────────────────────────────────────────────
//  SHARE HELPER — chunked write + native share
// ─────────────────────────────────────────────────────────

const _writeAndShare = async (
  zipBytes: Uint8Array,
  filename: string,
  title: string,
  text: string,
  dialogTitle: string
): Promise<void> => {
  const uri = await _writeChunked(zipBytes, filename, Directory.Cache);
  await Share.share({ title, text, files: [uri], dialogTitle });
};

// ─────────────────────────────────────────────────────────
//  PUBLIC API
// ─────────────────────────────────────────────────────────

export const communityService = {

  /**
   * Export a shelf as a ZIP file.
   * 
   * ARCHITECTURE CHANGE (v2.1):
   * Returns { uri, filename } instead of { data, filename }.
   * The ZIP is written directly to the native filesystem in chunks,
   * never held as a single base64 string in JS memory.
   */
  exportShelf: async (
    shelf: ShelfData, books: Book[], userName = 'User'
  ): Promise<{ uri: string; filename: string }> => {
    const zipBytes = await _buildZipStreaming(shelf, books, userName);
    const name = shelf.name.replace(/[\\\/\*?:"<>|]/g, '').trim() || 'shelf';
    const filename = `${name}.zip`;

    // Write ZIP bytes to filesystem in safe chunks — no single large base64 string
    const uri = await _writeChunked(zipBytes, filename, Directory.Documents);

    // Release the zipBytes buffer now that it's persisted
    // (V8 will GC it once this scope exits)

    return { uri, filename };
  },

  importShelf: async (
    jsonData: string, targetShelfId?: string
  ): Promise<{ shelf: ShelfData; books: Book[] }> => {
    return _importFromJson(jsonData, targetShelfId);
  },

  importFile: async (file: File): Promise<{ shelf: ShelfData; books: Book[] }> => {
    if (file.name.toLowerCase().endsWith('.zip')) return _importFromZip(file);
    const json = await communityService.readFile(file);
    return _importFromJson(json);
  },

  /**
   * Download/save a file using its native URI.
   * 
   * ARCHITECTURE CHANGE (v2.1):
   * Now accepts a URI (from exportShelf) instead of raw base64 content.
   * This eliminates the double-serialization bottleneck entirely.
   */
  downloadFile: async (uri: string, filename: string, lang: 'ar' | 'en' = 'ar'): Promise<void> => {
    try {
      await Share.share({
        title: lang === 'ar' ? `تنزيل رف: ${filename}` : `Download Shelf: ${filename}`,
        text: lang === 'ar' ? 'جاري حفظ نسخة من الرف...' : 'Saving shelf to your device...',
        files: [uri],
      });
    } catch (e) { console.error('Download failed', e); }
  },

  readFile: (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = e => res(e.target?.result as string);
      r.onerror = () => rej(new Error('Failed to read file'));
      r.readAsText(file);
    }),

  shareShelf: async (
    shelf: ShelfData, books: Book[], userName = 'User', lang: 'ar' | 'en' = 'ar'
  ): Promise<{ success: boolean; method: 'share' | 'clipboard' }> => {
    try {
      const shelfBooks = books.filter(b => b.shelfId === shelf.id);
      const totalBooks = shelfBooks.length;
      
      let estimatedSize = 0;
      for (const book of shelfBooks.slice(0, Math.min(5, totalBooks))) {
        const size = await pdfStorage.getFileSize(book.id);
        if (size) estimatedSize += size;
      }
      if (totalBooks > 5) {
        estimatedSize += (estimatedSize / 5) * (totalBooks - 5);
      }
      
      const useLargeMethod = totalBooks > 15 || estimatedSize > 100 * 1024 * 1024;
      
      const zipBytes = await _buildZipStreaming(shelf, books, userName, useLargeMethod);
      
      const name = shelf.name.replace(/[\\\/\*?:"<>|]/g, '').trim() || 'shelf';

      await _writeAndShare(
        zipBytes,
        `share_${name}.zip`,
        lang === 'ar' ? `مشاركة رف: ${shelf.name}` : `Share Shelf: ${shelf.name}`,
        lang === 'ar' ? `إليك كتبي من المحراب - ${userName}` : `Here are my Sanctuary books - ${userName}`,
        lang === 'ar' ? 'اختر تطبيقاً للمشاركة' : 'Choose app to share'
      );
      return { success: true, method: 'share' };
    } catch (e: any) {
      console.error('shareShelf failed', e);
      return { success: false, method: 'clipboard' };
    }
  },

  // ─────────────────────────────────────────────────────────
  //  SINGLE BOOK PORTABILITY — Export / Import / Share
  // ─────────────────────────────────────────────────────────

  exportBook: async (book: Book): Promise<{ uri: string; filename: string }> => {
    const JSZip = await _loadJSZip();
    const zip = new JSZip();

    // Get PDF data
    const pdfData = await pdfStorage.getFile(book.id);
    if (pdfData) {
      zip.file('book.pdf', pdfData, { compression: 'STORE' });
    }

    // Get cover
    let cover = book.cover;
    try {
      const stored = await pdfStorage.getCover(book.id);
      if (stored) cover = stored;
    } catch {}

    // Metadata manifest
    zip.file('book.json', JSON.stringify({
      version: '1.0.0',
      format: 'sanctuary-book',
      exportedAt: new Date().toISOString(),
      title: book.title,
      author: book.author,
      cover: cover || '',
      annotations: book.annotations || [],
      stars: book.stars || 0,
      lastPage: book.lastPage || 0,
      timeSpentSeconds: book.timeSpentSeconds || 0,
      addedAt: book.addedAt || Date.now(),
    }));

    const zipBytes: Uint8Array = await zip.generateAsync({
      type: 'uint8array',
      compression: 'STORE',
      streamFiles: true,
    });

    const safeName = book.title.replace(/[\\/*?:"<>|]/g, '').trim() || 'book';
    const filename = `${safeName}.sbook`;
    const uri = await _writeChunked(zipBytes, filename, Directory.Cache);

    return { uri, filename };
  },

  importBook: async (file: File, targetShelfId: string): Promise<Book> => {
    const JSZip = await _loadJSZip();
    const zip = await JSZip.loadAsync(file);

    const metaFile = zip.file('book.json');
    if (!metaFile) throw new Error('Invalid book file: missing book.json');
    const meta = JSON.parse(await metaFile.async('string'));

    const newId = `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Import PDF
    const pdfEntry = zip.file('book.pdf');
    if (pdfEntry) {
      const pdfBuf: ArrayBuffer = await pdfEntry.async('arraybuffer');
      await pdfStorage.saveFile(newId, pdfBuf);
    }

    // Import cover
    if (meta.cover?.startsWith('data:')) {
      await pdfStorage.saveCover(newId, meta.cover);
    }

    return {
      id: newId,
      shelfId: targetShelfId,
      title: meta.title,
      author: meta.author,
      cover: meta.cover || '',
      content: '[VISUAL_PDF_MODE]',
      timeSpentSeconds: meta.timeSpentSeconds || 0,
      dailyTimeSeconds: 0,
      stars: meta.stars || 0,
      addedAt: meta.addedAt || Date.now(),
      lastPage: meta.lastPage || 0,
      annotations: meta.annotations || [],
    };
  },

  shareBook: async (book: Book, lang: 'ar' | 'en' = 'ar'): Promise<void> => {
    const { uri } = await communityService.exportBook(book);
    await Share.share({
      title: lang === 'ar' ? `كتاب: ${book.title}` : `Book: ${book.title}`,
      text: lang === 'ar' ? `شارك كتاب "${book.title}" من المحراب` : `Sharing "${book.title}" from Sanctuary`,
      files: [uri],
      dialogTitle: lang === 'ar' ? 'مشاركة الكتاب' : 'Share Book',
    });
  },
};
