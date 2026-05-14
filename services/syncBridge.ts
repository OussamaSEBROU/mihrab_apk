import { Device } from '@capacitor/device';
import { Capacitor } from '@capacitor/core';

// رابط الـ Backend الصحيح كما في موقع Render
const API_BASE_URL = 'https://mihrab-backend.onrender.com'; 

// ===== OFFLINE-FIRST: SYNC QUEUE ENGINE =====
const SYNC_QUEUE_KEY = 'sanctuary_sync_queue';
const LAST_ACTIVITY_KEY = 'sanctuary_last_activity';

interface QueuedSync {
  payload: any;
  timestamp: number;
}

// ===== INDEXEDDB SYNC QUEUE PERSISTENCE =====
const SYNC_IDB_NAME = 'SanctuarySyncDB';
const SYNC_IDB_VERSION = 1;
const SYNC_STORE = 'SyncQueue';

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
  const trimmed = queue.slice(-20);
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(trimmed));
  _persistSyncQueueToIDB(trimmed).catch(() => {});
};

const clearSyncQueue = () => {
  localStorage.removeItem(SYNC_QUEUE_KEY);
  _persistSyncQueueToIDB([]).catch(() => {});
};

// ===== SILENT NETWORK FLUSH =====
const flushSyncQueue = async () => {
  let queue = getSyncQueue();
  if (queue.length === 0) {
    const idbQueue = await _readSyncQueueFromIDB();
    if (idbQueue.length > 0) {
      queue = idbQueue;
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
      remainingQueue.push(item);
    }
  }

  if (remainingQueue.length === 0) {
    clearSyncQueue();
  } else {
    saveSyncQueue(remainingQueue);
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    setTimeout(flushSyncQueue, 2000);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      setTimeout(flushSyncQueue, 1500);
    }
  });
}

export const syncBridge = {
    getDeviceId: async () => {
        try {
            const info = await Device.getId();
            return info.identifier;
        } catch (e) {
            return 'Safe_Node_' + Date.now();
        }
    },

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
     * المزامنة الشاملة (v4.0 Precision Sync):
     * تم تحديث الـ Payload فقط لإضافة الحقول المطلوبة للدقة
     */
    syncFull: async (books: any[], shelves: any[], activeStatus: string = 'Idle') => {
        syncBridge.recordActivity();

        try {
            const deviceId = await syncBridge.getDeviceId();
            const totalSec = books.reduce((acc, b) => acc + (b.timeSpentSeconds || 0), 0);

            // تم التعديل هنا فقط لتوفير دقة تتبع الكتب والمستعملين
            const payload = {
                deviceId,
                data: {
                    activeStatus,
                    appVersion: '4.0.0', // إصدار التطبيق للمراقبة
                    platform: Capacitor.getPlatform(),
                    shelves: shelves.map(s => ({ id: s.id, name: s.name, color: s.color })),
                    books: books.map(b => ({
                        id: b.id,
                        title: b.title,
                        shelfId: b.shelfId,
                        stars: b.stars || 0,
                        timeSpentSeconds: b.timeSpentSeconds || 0,
                        // الحقول الجديدة التي طلبتها في الـ CSV
                        dailyTimeSeconds: b.dailyTimeSeconds || 0,
                        lastReadAt: b.lastReadAt || Date.now(),
                        lastReadDate: b.lastReadDate || '',
                        addedAt: b.addedAt || Date.now()
                    })),
                    readingStats: {
                        totalMinutes: Math.floor(totalSec / 60)
                    }
                }
            };

            if (!navigator.onLine) {
                const queue = getSyncQueue();
                queue.push({ payload, timestamp: Date.now() });
                saveSyncQueue(queue);
                return;
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            await fetch(`${API_BASE_URL}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            const pendingQueue = getSyncQueue();
            if (pendingQueue.length > 0) {
                setTimeout(flushSyncQueue, 1000);
            }

        } catch (error: any) {
            console.error('Sync Pulse Error', error.message);
        }
    },

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
            }).catch(() => {});
        } catch (e) {}
    },

    flushPendingSync: flushSyncQueue
};
