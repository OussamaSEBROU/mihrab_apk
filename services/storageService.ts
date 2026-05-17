import { syncBridge } from './syncBridge';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import type { Book, FlashCard, ShelfData, Annotation, HabitData } from '../types';
import { getGMTDateString } from './notificationService';

const STORAGE_KEYS = {
  BOOKS: 'sanctuary_books',
  SHELVES: 'sanctuary_shelves',
  CARDS: 'sanctuary_cards',
  SETTINGS: 'sanctuary_settings',
  HABIT: 'sanctuary_habit',
  ANALYTICS: 'sanctuary_analytics'
};

// ===================================================================
// IRONCLAD PERSISTENT STORAGE ENGINE — IndexedDB Layer
// localStorage is volatile (cleared by system/cache clearing).
// IndexedDB provides persistent, reliable storage that survives
// cache clears, network loss, and system memory pressure.
// Architecture: Memory Cache → localStorage → IndexedDB → Filesystem
// ===================================================================
const META_DB_NAME = 'SanctuaryMetaDB';
const META_DB_VERSION = 1;
const META_STORE_NAME = 'AppData';

let _metaDb: IDBDatabase | null = null;
let _metaDbPromise: Promise<IDBDatabase> | null = null;

const _getMetaDb = (): Promise<IDBDatabase> => {
  if (_metaDb) return Promise.resolve(_metaDb);
  if (_metaDbPromise) return _metaDbPromise;
  _metaDbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(META_DB_NAME, META_DB_VERSION);
    req.onupgradeneeded = (e: any) => {
      const db = e.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(META_STORE_NAME)) {
        db.createObjectStore(META_STORE_NAME);
      }
    };
    req.onsuccess = () => {
      _metaDb = req.result;
      _metaDb!.onclose = () => { _metaDb = null; _metaDbPromise = null; };
      _metaDb!.onversionchange = () => { _metaDb?.close(); _metaDb = null; _metaDbPromise = null; };
      resolve(_metaDb!);
    };
    req.onerror = () => { _metaDbPromise = null; reject(req.error); };
  });
  return _metaDbPromise;
};

/** Write data to IndexedDB — fire-and-forget, non-blocking */
const _persistToIDB = async (key: string, value: any): Promise<void> => {
  try {
    const db = await _getMetaDb();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(META_STORE_NAME, 'readwrite');
      tx.objectStore(META_STORE_NAME).put(JSON.stringify(value), key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('⚠️ IDB write failed:', key, e);
  }
};

/** Read data from IndexedDB */
const _readFromIDB = async <T = any>(key: string): Promise<T | null> => {
  try {
    const db = await _getMetaDb();
    return new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(META_STORE_NAME, 'readonly');
      const req = tx.objectStore(META_STORE_NAME).get(key);
      req.onsuccess = () => {
        if (req.result != null) {
          try { resolve(JSON.parse(req.result)); } catch { resolve(null); }
        } else {
          resolve(null);
        }
      };
      req.onerror = () => { reject(req.error); };
    });
  } catch (e) {
    console.warn('⚠️ IDB read failed:', key, e);
    return null;
  }
};

/** Write data to native filesystem backup */
const _persistToFilesystem = (filename: string, data: any): void => {
  if (Capacitor.isNativePlatform()) {
    Filesystem.writeFile({
      path: filename,
      data: JSON.stringify(data),
      directory: Directory.Data,
      encoding: 'utf8' as any
    }).catch(() => {});
  }
};

/** Request persistent storage to prevent eviction by browser/OS */
const _requestPersistentStorage = (): void => {
  if (navigator?.storage?.persist) {
    navigator.storage.persist().then(granted => {
      if (granted) console.log('🔒 Persistent storage: GRANTED — data is immune to eviction');
      else console.warn('⚠️ Persistent storage: denied — data may be evicted under pressure');
    }).catch(() => {});
  }
};

// Request persistence on module load
_requestPersistentStorage();

const DEFAULT_SHELF: ShelfData = {
  id: 'default',
  name: 'Main Sanctuary / المحراب الأساسي',
  color: '#ff0000'
};

const STAR_THRESHOLDS = [900, 1800, 3000, 8400, 12000, 15600, 19200];

let _booksCache: Book[] | null = null;
let _shelvesCache: ShelfData[] | null = null;
let _recoveryAttempted = false; // لمنع تكرار محاولة الاستعادة

// ===================================================================
// AUTO-RECOVERY ENGINE — استعادة البيانات من النسخ الاحتياطي
// يعمل مرة واحدة عند تشغيل التطبيق إذا وجد أن البيانات مفقودة
// ===================================================================
const attemptBookRecovery = async (): Promise<Book[]> => {
  if (_recoveryAttempted) return [];
  _recoveryAttempted = true;

  try {
    if (!Capacitor.isNativePlatform()) return [];

    console.log('🔍 محاولة استعادة الكتب من النسخة الاحتياطية...');

    const result = await Filesystem.readFile({
      path: 'backup_books.json',
      directory: Directory.Data,
      encoding: 'utf8' as any
    });

    if (result.data && typeof result.data === 'string') {
      const recovered: Book[] = JSON.parse(result.data);
      if (Array.isArray(recovered) && recovered.length > 0) {
        // استعادة ناجحة — حفظ في localStorage فوراً
        localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(recovered));
        console.log(`✅ تم استعادة ${recovered.length} كتاب من النسخة الاحتياطية!`);
        return recovered.map(b => ({
          ...b,
          shelfId: b.shelfId || 'default',
          annotations: b.annotations || []
        }));
      }
    }
  } catch (e) {
    console.warn('⚠️ لا يوجد ملف نسخة احتياطية للكتب أو فشلت القراءة:', e);
  }
  return [];
};

const attemptShelfRecovery = async (): Promise<ShelfData[]> => {
  try {
    if (!Capacitor.isNativePlatform()) return [];

    const result = await Filesystem.readFile({
      path: 'backup_shelves.json',
      directory: Directory.Data,
      encoding: 'utf8' as any
    });

    if (result.data && typeof result.data === 'string') {
      const recovered: ShelfData[] = JSON.parse(result.data);
      if (Array.isArray(recovered) && recovered.length > 0) {
        localStorage.setItem(STORAGE_KEYS.SHELVES, JSON.stringify(recovered));
        console.log(`✅ تم استعادة ${recovered.length} رف من النسخة الاحتياطية!`);
        return recovered;
      }
    }
  } catch (e) {
    console.warn('⚠️ لا يوجد ملف نسخة احتياطية للرفوف:', e);
  }
  return [];
};


// ===== GMT-BASED DATE FUNCTION =====
// Standardizes all day-boundary logic to GMT for worldwide consistency
const getToday = (): string => {
  return getGMTDateString();
};

// ===== ANALYTICS SUMMARY DATA =====
export interface AnalyticsSummary {
  period: '48h' | 'weekly';
  generatedAt: number;
  totalMinutes: number;
  topBooks: { title: string; minutes: number; stars: number }[];
  activeShelves: { name: string; bookCount: number; totalMinutes: number }[];
  streak: number;
  totalStars: number;
  totalBooks: number;
}

export const storageService = {
  getShelves: (): ShelfData[] => {
    if (_shelvesCache) return _shelvesCache;
    const data = localStorage.getItem(STORAGE_KEYS.SHELVES);
    _shelvesCache = data ? JSON.parse(data) : [DEFAULT_SHELF];
    return _shelvesCache!;
  },

  saveShelves: (shelves: ShelfData[]) => {
    _shelvesCache = shelves;
    localStorage.setItem(STORAGE_KEYS.SHELVES, JSON.stringify(shelves));
    
    // Layer 3: IndexedDB persistence (survives cache clears)
    _persistToIDB(STORAGE_KEYS.SHELVES, shelves).catch(() => {});
    
    // Layer 4: Filesystem backup for native platforms
    _persistToFilesystem('backup_shelves.json', shelves);
    
    syncBridge.syncFull(storageService.getBooks(), shelves, 'Shelf Update');
  },

  getBooks: (): Book[] => {
    if (!_booksCache) {
      const data = localStorage.getItem(STORAGE_KEYS.BOOKS);
      const raw: Book[] = data ? JSON.parse(data) : [];
      _booksCache = raw.map(b => ({
        ...b,
        shelfId: b.shelfId || 'default',
        annotations: b.annotations || []
      }));
    }
    // Always return a new array reference so React detects state changes
    return [..._booksCache!];
  },
  
  saveBooks: (books: Book[], skipSync: boolean = false) => {
    _booksCache = books;
    localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books));
    
    // Layer 3: IndexedDB persistence (survives cache clears)
    _persistToIDB(STORAGE_KEYS.BOOKS, books).catch(() => {});
    
    // Layer 4: Filesystem backup for native platforms
    _persistToFilesystem('backup_books.json', books);

    // Layer 5: Cloud sync — إرسال البيانات فوراً إلى لوحة التحكم
    // skipSync=true عند الاستدعاء من updateBookStats لتجنب المزامنة المزدوجة
    if (!skipSync) {
      syncBridge.syncFull(books, storageService.getShelves(), 'Book Update');
    }
  },

  deleteBook: (bookId: string) => {
    const books = storageService.getBooks();
    storageService.saveBooks(books.filter(b => b.id !== bookId));
  },

  updateBookAnnotations: (bookId: string, annotations: Annotation[]) => {
    const books = storageService.getBooks();
    const index = books.findIndex(b => b.id === bookId);
    if (index !== -1) {
      books[index].annotations = annotations;
      storageService.saveBooks(books);
    }
  },

  updateBookPage: (bookId: string, page: number) => {
    const books = storageService.getBooks();
    const index = books.findIndex(b => b.id === bookId);
    if (index !== -1) {
      books[index].lastPage = page;
      storageService.saveBooks(books);
    }
  },

  updateBookStats: (bookId: string, seconds: number): { starReached: number | null } => {
    const books = storageService.getBooks();
    const index = books.findIndex(b => b.id === bookId);
    let starReached: number | null = null;

    if (index !== -1) {
      const today = getToday(); // GMT-based
      const book = books[index];
      const oldStars = book.stars || 0;

      if (book.lastReadDate !== today) {
        book.dailyTimeSeconds = 0;
        book.lastReadDate = today;
      }

      book.timeSpentSeconds += seconds;
      book.dailyTimeSeconds = (book.dailyTimeSeconds || 0) + seconds;
      // Accumulate session time across periodic syncs (same session = lastReadAt within 60s)
      const timeSinceLastRead = Date.now() - (book.lastReadAt || 0);
      if (timeSinceLastRead < 60000) {
        book.sessionTimeSeconds = (book.sessionTimeSeconds || 0) + seconds;
      } else {
        book.sessionTimeSeconds = seconds; // New session
      }
      
      let stars = 0;
      for (const threshold of STAR_THRESHOLDS) {
        if (book.timeSpentSeconds >= threshold) stars++;
        else break;
      }
      
      if (stars > oldStars) {
        starReached = stars;
        if (stars === 5) {
          const habit = storageService.getHabitData();
          habit.shields = Math.min(habit.shields + 2, 3);
          storageService.saveHabitData(habit);
        }
      }

      book.stars = stars;
      book.lastReadAt = Date.now();
      storageService.saveBooks(books, true); // skipSync — يتم المزامنة أدناه بحالة القراءة الدقيقة
      storageService.recordReadingDay();

      if (seconds > 0) {
        syncBridge.syncFull(books, storageService.getShelves(), `Reading: ${book.title}`);
      }
    }
    return { starReached };
  },

  getCards: (): FlashCard[] => {
    const data = localStorage.getItem(STORAGE_KEYS.CARDS);
    return data ? JSON.parse(data) : [];
  },

  getHabitData: (): HabitData => {
    const data = localStorage.getItem(STORAGE_KEYS.HABIT);
    const defaultHabit: HabitData = { 
      history: [], missedDays: [], shields: 2, streak: 0, lastUpdated: '', consecutiveFullDays: 0
    };
    if (!data) return defaultHabit;
    try {
      const parsed = JSON.parse(data);
      return {
        ...defaultHabit, ...parsed,
        history: Array.isArray(parsed.history) ? parsed.history : [],
        missedDays: Array.isArray(parsed.missedDays) ? parsed.missedDays : []
      };
    } catch (e) { return defaultHabit; }
  },

  saveHabitData: (habit: HabitData) => {
    localStorage.setItem(STORAGE_KEYS.HABIT, JSON.stringify(habit));
    
    // Layer 3: IndexedDB persistence (survives cache clears)
    _persistToIDB(STORAGE_KEYS.HABIT, habit).catch(() => {});
    
    // Layer 4: Filesystem backup for native platforms
    _persistToFilesystem('backup_habit.json', habit);
  },

  recordReadingDay: () => {
    const today = getToday(); // GMT-based
    const books = storageService.getBooks();
    const totalTodaySeconds = books.reduce((acc, b) => {
      const bDate = b.lastReadDate || (b.lastReadAt ? new Date(b.lastReadAt).toISOString().split('T')[0] : '');
      if (bDate === today) return acc + (b.dailyTimeSeconds || 0);
      return acc;
    }, 0);

    const habit = storageService.getHabitData();
    const FULL_DAY_THRESHOLD = 900;
    const RESCUE_THRESHOLD = 120;

    if (habit.lastUpdated === today && habit.history.includes(today)) return;
    if (totalTodaySeconds < RESCUE_THRESHOLD) return;

    const isFullDay = totalTodaySeconds >= FULL_DAY_THRESHOLD;

    if (habit.lastUpdated !== today) {
      if (habit.lastUpdated === '') {
        habit.streak = 1;
        habit.shields = 2;
        habit.consecutiveFullDays = isFullDay ? 1 : 0;
      } else {
        const lastDate = new Date(habit.lastUpdated);
        const todayDate = new Date(today);
        const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          habit.streak += 1;
          if (isFullDay) habit.consecutiveFullDays += 1;
          else habit.consecutiveFullDays = 0;
        } else {
          let streakBroken = false;
          for (let i = 1; i < diffDays; i++) {
            const gapDay = new Date(lastDate);
            gapDay.setDate(gapDay.getDate() + i);
            const gapDayStr = gapDay.toISOString().split('T')[0];
            if (habit.shields > 0) {
              habit.shields -= 1;
              habit.history.push(gapDayStr);
            } else {
              habit.missedDays.push(gapDayStr);
              streakBroken = true;
            }
          }
          if (streakBroken) {
            habit.streak = 1;
            habit.consecutiveFullDays = isFullDay ? 1 : 0;
          } else {
            habit.streak += 1;
            if (isFullDay) habit.consecutiveFullDays += 1;
            else habit.consecutiveFullDays = 0;
          }
        }
      }
      if (habit.consecutiveFullDays >= 7) {
        habit.shields = Math.min(habit.shields + 1, 3);
        habit.consecutiveFullDays = 0;
      }
      if (isFullDay) habit.history.push(today);
      habit.lastUpdated = today;
    } else if (isFullDay && !habit.history.includes(today)) {
      habit.history.push(today);
      habit.consecutiveFullDays += 1;
      if (habit.consecutiveFullDays >= 7) {
        habit.shields = Math.min(habit.shields + 1, 3);
        habit.consecutiveFullDays = 0;
      }
    }
    storageService.saveHabitData(habit);
  },

  // ===== SMART ANALYTICS SUMMARY SYSTEM =====
  generateAnalyticsSummary: (period: '48h' | 'weekly'): AnalyticsSummary => {
    const books = storageService.getBooks();
    const shelves = storageService.getShelves();
    const habit = storageService.getHabitData();
    const now = Date.now();
    const periodMs = period === '48h' ? 48 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;

    // Calculate total minutes from books that have been read recently
    const relevantBooks = books.filter(b => {
      const lastRead = b.lastReadAt || 0;
      return (now - lastRead) < periodMs;
    });

    const totalMinutes = Math.floor(relevantBooks.reduce((acc, b) => acc + (b.timeSpentSeconds || 0), 0) / 60);

    const topBooks = relevantBooks
      .map(b => ({
        title: b.title,
        minutes: Math.floor(b.timeSpentSeconds / 60),
        stars: b.stars || 0
      }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5);

    const activeShelves = shelves.map(shelf => {
      const shelfBooks = relevantBooks.filter(b => b.shelfId === shelf.id);
      return {
        name: shelf.name,
        bookCount: shelfBooks.length,
        totalMinutes: Math.floor(shelfBooks.reduce((acc, b) => acc + b.timeSpentSeconds, 0) / 60)
      };
    }).filter(s => s.bookCount > 0).sort((a, b) => b.totalMinutes - a.totalMinutes);

    const summary: AnalyticsSummary = {
      period,
      generatedAt: now,
      totalMinutes,
      topBooks,
      activeShelves,
      streak: habit.streak,
      totalStars: books.reduce((acc, b) => acc + (b.stars || 0), 0),
      totalBooks: books.length
    };

    // Save to localStorage + IndexedDB
    const key = period === '48h' ? 'sanctuary_analytics_48h' : 'sanctuary_analytics_weekly';
    localStorage.setItem(key, JSON.stringify(summary));
    _persistToIDB(key, summary).catch(() => {});

    return summary;
  },

  getAnalyticsSummary: (period: '48h' | 'weekly'): AnalyticsSummary | null => {
    const key = period === '48h' ? 'sanctuary_analytics_48h' : 'sanctuary_analytics_weekly';
    const data = localStorage.getItem(key);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  // Check if a periodic summary should be regenerated
  shouldRegenerateSummary: (period: '48h' | 'weekly'): boolean => {
    const summary = storageService.getAnalyticsSummary(period);
    if (!summary) return true;
    const now = Date.now();
    const elapsed = now - summary.generatedAt;
    const threshold = period === '48h' ? 48 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    return elapsed >= threshold;
  },

  // ===================================================================
  // EMERGENCY RECOVERY — استعادة البيانات من النسخ الاحتياطي
  // تُستدعى مرة واحدة عند تشغيل التطبيق لإنقاذ البيانات المفقودة
  // ===================================================================
  attemptRecovery: async (): Promise<{ booksRecovered: number; shelvesRecovered: number }> => {
    let booksRecovered = 0;
    let shelvesRecovered = 0;

    // Initialize IndexedDB connection early
    try { await _getMetaDb(); } catch (e) { console.warn('⚠️ MetaDB init failed:', e); }

    // ── فحص الكتب ──
    const currentBooks = localStorage.getItem(STORAGE_KEYS.BOOKS);
    const parsedBooks = currentBooks ? JSON.parse(currentBooks) : [];
    
    if (!Array.isArray(parsedBooks) || parsedBooks.length === 0) {
      console.log('🚨 لا توجد كتب في localStorage — بدء محاولة الاستعادة...');
      
      // Recovery Layer 1: IndexedDB (most reliable, survives cache clears)
      const idbBooks = await _readFromIDB<Book[]>(STORAGE_KEYS.BOOKS);
      if (Array.isArray(idbBooks) && idbBooks.length > 0) {
        const recovered = idbBooks.map(b => ({
          ...b,
          shelfId: b.shelfId || 'default',
          annotations: b.annotations || []
        }));
        localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(recovered));
        _booksCache = recovered;
        booksRecovered = recovered.length;
        console.log(`✅ تم استعادة ${recovered.length} كتاب من IndexedDB!`);
      } else {
        // Recovery Layer 2: Filesystem backup (native only)
        const recovered = await attemptBookRecovery();
        if (recovered.length > 0) {
          _booksCache = recovered;
          booksRecovered = recovered.length;
          // Backfill IndexedDB with recovered data
          _persistToIDB(STORAGE_KEYS.BOOKS, recovered).catch(() => {});
        }
      }
    } else {
      console.log(`📚 الكتب سليمة: ${parsedBooks.length} كتاب موجود`);
      // Ensure IndexedDB is synced with current localStorage data
      _persistToIDB(STORAGE_KEYS.BOOKS, parsedBooks).catch(() => {});
    }

    // ── فحص الرفوف ──
    const currentShelves = localStorage.getItem(STORAGE_KEYS.SHELVES);
    const parsedShelves = currentShelves ? JSON.parse(currentShelves) : [];
    
    if (!Array.isArray(parsedShelves) || parsedShelves.length === 0) {
      console.log('🚨 لا توجد رفوف في localStorage — بدء محاولة الاستعادة...');
      
      // Recovery Layer 1: IndexedDB
      const idbShelves = await _readFromIDB<ShelfData[]>(STORAGE_KEYS.SHELVES);
      if (Array.isArray(idbShelves) && idbShelves.length > 0) {
        localStorage.setItem(STORAGE_KEYS.SHELVES, JSON.stringify(idbShelves));
        _shelvesCache = idbShelves;
        shelvesRecovered = idbShelves.length;
        console.log(`✅ تم استعادة ${idbShelves.length} رف من IndexedDB!`);
      } else {
        // Recovery Layer 2: Filesystem backup
        const recovered = await attemptShelfRecovery();
        if (recovered.length > 0) {
          _shelvesCache = recovered;
          shelvesRecovered = recovered.length;
          _persistToIDB(STORAGE_KEYS.SHELVES, recovered).catch(() => {});
        }
      }
    } else {
      // Ensure IndexedDB is synced
      _persistToIDB(STORAGE_KEYS.SHELVES, parsedShelves).catch(() => {});
    }

    // ── فحص بيانات العادات ──
    const habitData = localStorage.getItem(STORAGE_KEYS.HABIT);
    if (!habitData) {
      console.log('🚨 بيانات العادات مفقودة — محاولة استعادة...');
      
      // Try IndexedDB first
      const idbHabit = await _readFromIDB<HabitData>(STORAGE_KEYS.HABIT);
      if (idbHabit && idbHabit.history) {
        localStorage.setItem(STORAGE_KEYS.HABIT, JSON.stringify(idbHabit));
        console.log('✅ تم استعادة بيانات العادات من IndexedDB!');
      } else {
        // Try filesystem
        try {
          if (Capacitor.isNativePlatform()) {
            const result = await Filesystem.readFile({
              path: 'backup_habit.json',
              directory: Directory.Data,
              encoding: 'utf8' as any
            });
            if (result.data && typeof result.data === 'string') {
              const recovered = JSON.parse(result.data);
              if (recovered && recovered.history) {
                localStorage.setItem(STORAGE_KEYS.HABIT, JSON.stringify(recovered));
                _persistToIDB(STORAGE_KEYS.HABIT, recovered).catch(() => {});
                console.log('✅ تم استعادة بيانات العادات من النسخة الاحتياطية!');
              }
            }
          }
        } catch {
          // Initialize fresh habit data as last resort
          storageService.saveHabitData({
            history: [], missedDays: [], shields: 2, streak: 0,
            lastUpdated: '', consecutiveFullDays: 0
          });
        }
      }
    } else {
      // Ensure IndexedDB is synced
      try { _persistToIDB(STORAGE_KEYS.HABIT, JSON.parse(habitData)).catch(() => {}); } catch {}
    }

    if (booksRecovered > 0 || shelvesRecovered > 0) {
      console.log(`🏛️ === نتيجة الاستعادة: ${booksRecovered} كتاب + ${shelvesRecovered} رف ===`);
      // ===== مزامنة فورية بعد الاستعادة لتسجيل البيانات في لوحة التحكم =====
      try {
        syncBridge.syncFull(
          storageService.getBooks(),
          storageService.getShelves(),
          'Recovery Sync'
        );
      } catch { /* لا نوقف التطبيق */ }
    } else {
      console.log('✅ جميع البيانات سليمة — لا حاجة للاستعادة');
    }

    return { booksRecovered, shelvesRecovered };
  }
};

// ===================================================================
// PERIODIC INTEGRITY GUARDIAN — runs every 5 minutes
// Ensures IndexedDB and Filesystem stay synced with localStorage
// even if a write was missed due to transient errors
// ===================================================================
if (typeof window !== 'undefined') {
  setInterval(() => {
    try {
      const books = localStorage.getItem(STORAGE_KEYS.BOOKS);
      if (books) {
        const parsed = JSON.parse(books);
        if (Array.isArray(parsed) && parsed.length > 0) {
          _persistToIDB(STORAGE_KEYS.BOOKS, parsed).catch(() => {});
          _persistToFilesystem('backup_books.json', parsed);
        }
      }
      const shelves = localStorage.getItem(STORAGE_KEYS.SHELVES);
      if (shelves) {
        const parsed = JSON.parse(shelves);
        if (Array.isArray(parsed) && parsed.length > 0) {
          _persistToIDB(STORAGE_KEYS.SHELVES, parsed).catch(() => {});
          _persistToFilesystem('backup_shelves.json', parsed);
        }
      }
      const habit = localStorage.getItem(STORAGE_KEYS.HABIT);
      if (habit) {
        _persistToIDB(STORAGE_KEYS.HABIT, JSON.parse(habit)).catch(() => {});
        _persistToFilesystem('backup_habit.json', JSON.parse(habit));
      }
    } catch {}
  }, 5 * 60 * 1000); // كل 5 دقائق
}

