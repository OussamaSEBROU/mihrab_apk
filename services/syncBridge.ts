import { Device } from '@capacitor/device';
import { App as CapApp } from '@capacitor/app';
import { getDB } from './pdfStorage';

// رابط الـ Backend الجديد والمطور على موقع Render
const API_BASE_URL = 'https://mihrabadminv2.onrender.com/api';

// ===== STABLE DEVICE ID — يبقى ثابتاً حتى لو فشل Capacitor =====
const DEVICE_ID_KEY = 'sanctuary_stable_device_id';
const FIRST_VERSION_KEY = 'sanctuary_first_app_version';
const INSTALL_DATE_KEY = 'sanctuary_install_date';

const _getStableFallbackId = (): string => {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = 'Node_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36);
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
};

// ===== RENDER WAKE-UP — يوقظ السيرفر قبل الإرسال =====
// Render free tier cold starts take 30-60 seconds — timeout must be generous
let _serverAwake = false;
const _wakeUpServer = async (): Promise<void> => {
  if (_serverAwake) return;
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 50000); // 50s for Render cold start
    const resp = await fetch(`${API_BASE_URL}/test`, { signal: ctrl.signal });
    clearTimeout(tid);
    if (resp.ok) {
      _serverAwake = true;
      setTimeout(() => { _serverAwake = false; }, 5 * 60 * 1000);
      console.log('✅ Server is awake and responding');
    }
  } catch (e) {
    console.warn('⚠️ Server wake-up failed — will retry on sync');
  }
};

// ===== SYNC WITH RETRY — يعيد المحاولة عند الفشل =====
const _syncWithRetry = async (payload: any, maxAttempts: number = 3): Promise<boolean> => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await _wakeUpServer();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      const resp = await fetch(`${API_BASE_URL}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (resp.ok) {
        const data = await resp.json();
        if (data.success) {
          console.log(`✅ Sync succeeded on attempt ${attempt}`);
          return true;
        }
      }
    } catch (e: any) {
      console.warn(`⚠️ Sync attempt ${attempt}/${maxAttempts} failed: ${e.message || 'timeout'}`);
    }
    if (attempt < maxAttempts) {
      const delay = attempt * 5000; // 5s, 10s backoff
      console.log(`⏳ Retrying in ${delay / 1000}s...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  return false;
};

// ===== APP VERSION HELPER =====
const _getAppVersion = async (): Promise<string> => {
  try {
    const info = await CapApp.getInfo();
    return info.version || 'unknown';
  } catch { return 'unknown'; }
};

const _getHasUpdated = async (): Promise<boolean> => {
  try {
    const ver = await _getAppVersion();
    const first = localStorage.getItem(FIRST_VERSION_KEY);
    if (!first) { localStorage.setItem(FIRST_VERSION_KEY, ver); return false; }
    return first !== ver;
  } catch { return false; }
};

// ===== بناء الحمولة الكاملة مع كل التفاصيل المطلوبة =====
const _buildFullPayload = async (books: any[], shelves: any[], activeStatus: string) => {
  const deviceId = await syncBridge.getDeviceId();
  const appVersion = await _getAppVersion();
  const hasUpdated = await _getHasUpdated();

  const totalSec = books.reduce((acc: number, b: any) => acc + (b.timeSpentSeconds || 0), 0);
  const totalStars = books.reduce((acc: number, b: any) => acc + (b.stars || 0), 0);

  // ===== إحصائيات اليوم =====
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const todayBooks = books.filter((b: any) => b.lastReadDate === today);
  const dailySeconds = todayBooks.reduce((acc: number, b: any) => acc + (b.dailyTimeSeconds || 0), 0);

  // ===== إحصائيات الأسبوع =====
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weeklyBooks = books.filter((b: any) => b.lastReadAt && b.lastReadAt > weekAgo);
  const weeklySeconds = weeklyBooks.reduce((acc: number, b: any) => acc + (b.timeSpentSeconds || 0), 0);

  // ===== آخر كتاب مقروء =====
  const sortedByRead = [...books].filter((b: any) => b.lastReadAt).sort((a: any, b: any) => (b.lastReadAt || 0) - (a.lastReadAt || 0));
  const lastBook = sortedByRead[0] || null;

  // ===== إحصائيات كل رف =====
  const shelfStats = shelves.map((s: any) => {
    const shelfBooks = books.filter((b: any) => b.shelfId === s.id);
    const shelfSec = shelfBooks.reduce((acc: number, b: any) => acc + (b.timeSpentSeconds || 0), 0);
    const shelfStars = shelfBooks.reduce((acc: number, b: any) => acc + (b.stars || 0), 0);
    return {
      id: s.id,
      name: s.name,
      color: s.color,
      bookCount: shelfBooks.length,
      totalMinutes: Math.floor(shelfSec / 60),
      totalStars: shelfStars,
      bookNames: shelfBooks.map((b: any) => b.title)
    };
  });

  // ===== تاريخ التثبيت الأول — يُحفظ مرة واحدة ولا يتغير أبداً =====
  let installDate = localStorage.getItem(INSTALL_DATE_KEY);
  if (!installDate) {
    installDate = new Date().toISOString();
    localStorage.setItem(INSTALL_DATE_KEY, installDate);
  }

  return {
    deviceId,
    data: {
      activeStatus,
      appVersion,
      hasUpdated,
      installDate,
      totalDownloads: books.length,
      shelves: shelves.map((s: any) => ({ id: s.id, name: s.name, color: s.color })),
      books: books.map((b: any) => ({
        id: b.id,
        title: b.title,
        shelfId: b.shelfId || 'default',
        author: b.author || '',
        stars: b.stars || 0,
        timeSpentSeconds: b.timeSpentSeconds || 0,
        dailyTimeSeconds: b.dailyTimeSeconds || 0,
        lastReadDate: b.lastReadDate || '',
        lastReadAt: b.lastReadAt || 0,
        addedAt: b.addedAt || 0,
        sessionTimeSeconds: b.sessionTimeSeconds || 0
      })),
      readingStats: {
        totalMinutes: Math.floor(totalSec / 60),
        totalStars,
        dailyMinutes: Math.floor(dailySeconds / 60),
        weeklyMinutes: Math.floor(weeklySeconds / 60),
        lastReadBook: lastBook ? {
          title: lastBook.title,
          minutes: Math.floor((lastBook.timeSpentSeconds || 0) / 60),
          lastReadAt: lastBook.lastReadAt
        } : null,
        shelfStats
      }
    }
  };
};

// ===== OFFLINE-FIRST: SYNC QUEUE ENGINE =====
const SYNC_QUEUE_KEY = 'sanctuary_sync_queue';
const LAST_ACTIVITY_KEY = 'sanctuary_last_activity';

interface QueuedSync {
  payload: any;
  timestamp: number;
}

// ===== UNIFIED INDEXEDDB SYNC QUEUE PERSISTENCE =====
const SYNC_STORE = 'SyncQueue';

const _persistSyncQueueToIDB = async (queue: QueuedSync[]): Promise<void> => {
  try {
    const db = await getDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(SYNC_STORE, 'readwrite');
      tx.objectStore(SYNC_STORE).put(JSON.stringify(queue), SYNC_QUEUE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { }
};

const _readSyncQueueFromIDB = async (): Promise<QueuedSync[]> => {
  try {
    const db = await getDB();
    return new Promise<QueuedSync[]>((resolve, reject) => {
      const tx = db.transaction(SYNC_STORE, 'readonly');
      const req = tx.objectStore(SYNC_STORE).get(SYNC_QUEUE_KEY);
      req.onsuccess = () => {
        if (req.result) {
          try { resolve(JSON.parse(req.result)); } catch { resolve([]); }
        } else { resolve([]); }
      };
      req.onerror = () => resolve([]);
    });
  } catch { return []; }
};

const getSyncQueue = (): QueuedSync[] => {
  try {
    const data = localStorage.getItem(SYNC_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
};

const saveSyncQueue = (queue: QueuedSync[]) => {
  const trimmed = queue.slice(-20);
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(trimmed));
  _persistSyncQueueToIDB(trimmed).catch(() => { });
};

const clearSyncQueue = () => {
  localStorage.removeItem(SYNC_QUEUE_KEY);
  _persistSyncQueueToIDB([]).catch(() => { });
};

// ===== SILENT NETWORK FLUSH =====
const flushSyncQueue = async () => {
  let queue = getSyncQueue();
  if (queue.length === 0) {
    const idbQueue = await _readSyncQueueFromIDB();
    if (idbQueue.length > 0) {
      queue = idbQueue;
      console.log(`🔄 Recovered ${idbQueue.length} sync items from IndexedDB`);
    }
  }
  if (queue.length === 0) return;

  const remainingQueue: QueuedSync[] = [];

  for (const item of queue) {
    const success = await _syncWithRetry(item.payload, 2);
    if (!success) {
      remainingQueue.push(item);
    }
  }

  if (remainingQueue.length === 0) {
    clearSyncQueue();
    console.log('✅ Offline queue fully flushed');
  } else {
    saveSyncQueue(remainingQueue);
    console.warn(`⚠️ ${remainingQueue.length} sync items still pending`);
  }
};

// ===== AUTO-FLUSH LISTENER =====
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('🌐 Connection restored — flushing sync queue silently...');
    setTimeout(flushSyncQueue, 2000);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      setTimeout(flushSyncQueue, 1500);
    }
  });

  // ===== IMMEDIATE STARTUP SYNC — مزامنة فورية عند فتح التطبيق =====
  // Uses retry mechanism to handle Render cold starts reliably
  setTimeout(async () => {
    if (!navigator.onLine) return;
    try {
      const { storageService } = await import('./storageService');
      const payload = await _buildFullPayload(
        storageService.getBooks(),
        storageService.getShelves(),
        'Online'
      );
      const success = await _syncWithRetry(payload, 3);
      if (success) {
        console.log('🚀 Startup sync completed — device registered');
      } else {
        // Queue for later if all retries failed
        const queue = getSyncQueue();
        queue.push({ payload, timestamp: Date.now() });
        saveSyncQueue(queue);
        console.warn('📦 Startup sync failed — queued for retry');
      }
    } catch (e) { console.warn('⚠️ Startup sync error:', e); }
  }, 3000);

  // ===== PERIODIC HEARTBEAT — مزامنة كل دقيقتين =====
  setInterval(async () => {
    if (!navigator.onLine) return;
    try {
      const { storageService } = await import('./storageService');
      const books = storageService.getBooks();
      const shelves = storageService.getShelves();
      if (books.length > 0 || shelves.length > 0) {
        const payload = await _buildFullPayload(books, shelves, 'Online');
        const success = await _syncWithRetry(payload, 2);
        if (success) {
          console.log('💓 Heartbeat sent — full data synced');
        }
      }
    } catch { /* صامت */ }
  }, 2 * 60 * 1000); // ===== كل دقيقتين =====
}

export const syncBridge = {
  getDeviceId: async () => {
    try {
      const info = await Device.getId();
      if (info.identifier) {
        localStorage.setItem(DEVICE_ID_KEY, info.identifier);
      }
      return info.identifier;
    } catch (e) {
      return _getStableFallbackId();
    }
  },

  // ===== LAST ACTIVITY TRACKER =====
  recordActivity: () => {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  },

  getLastActivity: (): number => {
    const ts = localStorage.getItem(LAST_ACTIVITY_KEY);
    return ts ? parseInt(ts, 10) : Date.now();
  },

  getInactiveHours: (): number => {
    const last = syncBridge.getLastActivity();
    return (Date.now() - last) / (1000 * 60 * 60);
  },

  /**
   * المزامنة الشاملة — ترسل كل البيانات مع التفاصيل الكاملة
   */
  syncFull: async (books: any[], shelves: any[], activeStatus: string = 'Idle') => {
    syncBridge.recordActivity();

    try {
      const payload = await _buildFullPayload(books, shelves, activeStatus);

      // ── OFFLINE-FIRST CHECK ──
      if (!navigator.onLine) {
        const queue = getSyncQueue();
        queue.push({ payload, timestamp: Date.now() });
        saveSyncQueue(queue);
        console.log('📴 Offline — sync queued silently');
        return;
      }

      const success = await _syncWithRetry(payload, 2);

      if (success) {
        console.log('✅ Full sync completed with all details');
        // Flush any pending offline queue
        const pendingQueue = getSyncQueue();
        if (pendingQueue.length > 0) {
          setTimeout(flushSyncQueue, 1000);
        }
      } else {
        // Queue for retry
        const queue = getSyncQueue();
        queue.push({ payload, timestamp: Date.now() });
        saveSyncQueue(queue);
        console.log('📦 Sync failed after retries — queued for later');
      }

    } catch (error: any) {
      console.error('❌ Sync error:', error.message);
      try {
        const retryPayload = await _buildFullPayload(books, shelves, activeStatus);
        const queue = getSyncQueue();
        queue.push({ payload: retryPayload, timestamp: Date.now() });
        saveSyncQueue(queue);
        console.log('📦 Failed sync queued for automatic retry');
      } catch { /* صامت */ }
    }
  },

  /**
   * إرسال "نبضة" سريعة لمعرفة ماذا يقرأ المستخدم الآن
   */
  pushPulse: async (bookTitle: string) => {
    syncBridge.recordActivity();
    if (!navigator.onLine) return;

    try {
      const deviceId = await syncBridge.getDeviceId();
      await fetch(`${API_BASE_URL}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          data: { activeStatus: `Reading: ${bookTitle}` }
        })
      }).catch(() => { });
    } catch (e) { }
  },

  flushPendingSync: flushSyncQueue,

  /**
   * استعادة البيانات من السحابة — مزامنة ثنائية الاتجاه
   * تُستدعى عند فقدان البيانات المحلية لاسترجاعها من السيرفر
   */
  restoreFromCloud: async (): Promise<{ books: any[]; shelves: any[] } | null> => {
    if (!navigator.onLine) return null;
    try {
      const deviceId = await syncBridge.getDeviceId();
      await _wakeUpServer();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const response = await fetch(`${API_BASE_URL}/sync/${deviceId}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        const data = await response.json();
        if (data && data.data) {
          console.log('✅ تم استرجاع البيانات من السحابة!');
          return { books: data.data.books || [], shelves: data.data.shelves || [] };
        }
      }
    } catch (e: any) {
      console.warn('⚠️ Cloud restore failed:', e.message);
    }
    return null;
  }
};
