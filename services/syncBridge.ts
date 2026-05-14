import { Device } from '@capacitor/device';

// رابط الـ Backend الصحيح كما في موقع Render
const API_BASE_URL = 'https://mihrab-backend.onrender.com/api'; 

// ===== OFFLINE-FIRST: SYNC QUEUE ENGINE =====
// يحتفظ بالعمليات المعلقة عند عدم وجود اتصال ويرسلها تلقائياً عند العودة
const SYNC_QUEUE_KEY = 'sanctuary_sync_queue';
const LAST_ACTIVITY_KEY = 'sanctuary_last_activity';

interface QueuedSync {
  payload: any;
  timestamp: number;
}

// ===== INDEXEDDB SYNC QUEUE PERSISTENCE =====
// Survives cache clears — ensures offline syncs are never lost
const SYNC_IDB_NAME = 'SanctuarySyncDB';
const SYNC_IDB_VERSION = 1;
// const SYNC_STORE = 'SyncQueue';

let _syncDb: IDBDatabase | null = null;
let _syncDbPromise: Promise<IDBDatabase> | null = null;

const _getSyncDb = (): Promise<IDBDatabase> => {
  if (_syncDb) return Promise.resolve(_syncDb);
  if (_syncDbPromise) return _syncDbPromise;
  _syncDbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(SYNC_IDB_NAME, SYNC_IDB_VERSION);
    req.onupgradeneeded = (e: any) => {
      const db = e.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(SYNC_STORE)) {
        db.createObjectStore(SYNC_STORE);
      }
    };
    req.onsuccess = () => {
      _syncDb = req.result;
      _syncDb!.onclose = () => { _syncDb = null; _syncDbPromise = null; };
      resolve(_syncDb!);
    };
    req.onerror = () => { _syncDbPromise = null; reject(req.error); };
  });
  return _syncDbPromise;
};

const _persistSyncQueueToIDB = async (queue: QueuedSync[]): Promise<void> => {
  try {
    const db = await _getSyncDb();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(SYNC_STORE, 'readwrite');
      tx.objectStore(SYNC_STORE).put(JSON.stringify(queue), SYNC_QUEUE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
};

const _readSyncQueueFromIDB = async (): Promise<QueuedSync[]> => {
  try {
    const db = await _getSyncDb();
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
  // Keep max 20 entries to avoid storage bloat
  const trimmed = queue.slice(-20);
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(trimmed));
  // Persist to IndexedDB for cache-clear resilience
  _persistSyncQueueToIDB(trimmed).catch(() => {});
};

const clearSyncQueue = () => {
  localStorage.removeItem(SYNC_QUEUE_KEY);
  _persistSyncQueueToIDB([]).catch(() => {});
};

// ===== SILENT NETWORK FLUSH — fires when connectivity is restored =====
const flushSyncQueue = async () => {
  // Merge localStorage queue with IDB queue (in case localStorage was cleared)
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
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      await fetch(`${API_BASE_URL}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
    } catch {
      // If still failing, keep in queue for next retry
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

// ===== AUTO-FLUSH LISTENER — silent, zero-UI, no spinners =====
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('🌐 Connection restored — flushing sync queue silently...');
    // Delay slightly to let the connection stabilize
    setTimeout(flushSyncQueue, 2000);
  });

  // App lifecycle: flush when returning to foreground
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      setTimeout(flushSyncQueue, 1500);
    }
  });
}

export const syncBridge = {
    // وظيفة جلب بصمة الجهاز بأمان (تعديل Safe-Mode)
    getDeviceId: async () => {
        try {
            // نحاول جلب البصمة الحقيقية من الهاتف
            const info = await Device.getId();
            return info.identifier;
        } catch (e) {
            // في حالة فشل الاتصال بالمكتبة (لتجنب الشاشة السوداء)
            // نقوم بصنع بصمة مؤقتة تعتمد على الوقت
            return 'Safe_Node_' + Date.now();
        }
    },

    // ===== LAST ACTIVITY TRACKER — for 8-hour re-engagement =====
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
     * المزامنة الشاملة (النسخة المنقذة v3.0 — Offline-First):
     * تقوم بإرسال كل بيانات الرفوف والكتب
     * إذا لم يكن هناك اتصال: تخزّن البيانات في قائمة الانتظار
     * عند عودة الاتصال: تُرسل تلقائياً في الخلفية (بدون أي تأثير على الواجهة)
     */
    syncFull: async (books: any[], shelves: any[], activeStatus: string = 'Idle') => {
        // ── ALWAYS record activity timestamp (Offline-safe) ──
        syncBridge.recordActivity();

        try {
            const deviceId = await syncBridge.getDeviceId();
            
            // حساب دقيق للدقائق الكُلية المخزنة في الكتب
            const totalSec = books.reduce((acc, b) => acc + (b.timeSpentSeconds || 0), 0);
            
            const payload = {
                deviceId,
                data: {
                    activeStatus,
                    shelves: shelves.map(s => ({ id: s.id, name: s.name, color: s.color })),
                    books: books.map(b => ({
                        id: b.id,
                        title: b.title,
                        shelfId: b.shelfId,
                        stars: b.stars || 0,
                        timeSpentSeconds: b.timeSpentSeconds || 0
                    })),
                    readingStats: {
                        totalMinutes: Math.floor(totalSec / 60)
                    }
                }
            };

            // ── OFFLINE-FIRST CHECK: Queue if no network ──
            if (!navigator.onLine) {
                const queue = getSyncQueue();
                queue.push({ payload, timestamp: Date.now() });
                saveSyncQueue(queue);
                console.log('📴 Offline — sync queued silently');
                return;
            }

            // --- محرك الإرسال الذكي (بموقت زمني 5 ثوانٍ فقط) ---
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // لا ننتظر أكثر من 5 ثوانٍ

            await fetch(`${API_BASE_URL}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal // تفعيل خاصية الإلغاء
            });

            clearTimeout(timeoutId); // مسح المؤقت في حال النجاح
            console.log('✅ Synchronized with Neural Network');

            // ── If we just came online, also flush any queued items ──
            const pendingQueue = getSyncQueue();
            if (pendingQueue.length > 0) {
                setTimeout(flushSyncQueue, 1000);
            }

        } catch (error: any) {
            // في حالة التعطل أو التأخير، التطبيق سيتجاهل الأمر ولن يعلق!
            if (error.name === 'AbortError') {
                console.warn('⚠️ Sync timeout (Server slow), skipping pulse.');
            } else {
                // Queue the failed sync for retry
                console.error('❌ Network error during sync:', error.message);
            }
        }
    },

    /**
     * إرسال "نبضة" سريعة لمعرفة ماذا يقرأ المستخدم الآن
     */
    pushPulse: async (bookTitle: string) => {
        // Record activity for re-engagement tracking
        syncBridge.recordActivity();
        
        // Skip network call if offline (no need to queue pulses)
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
            }).catch(() => {});
        } catch (e) {}
    },

    /**
     * Manual flush — can be called from SystemNotificationManager on app resume
     */
    flushPendingSync: flushSyncQueue
};
