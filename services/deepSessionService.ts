import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { getDB } from './pdfStorage';
import { storageService } from './storageService';
import { syncBridge } from './syncBridge';
import type { DeepSession, DeepSessionStats } from '../types';

// ===================================================================
// DEEP SESSION SERVICE — محرك جلسات القراءة العميقة
// يتبع نفس بنية storageService: Memory Cache → localStorage → IndexedDB → Filesystem
// ===================================================================

const STORAGE_KEY = 'sanctuary_deep_sessions';
const SYNC_QUEUE_KEY = 'sanctuary_deep_session_sync_queue';

let _sessionsCache: DeepSession[] | null = null;

// ── IndexedDB Persistence (survives cache clears) ──
const META_STORE = 'AppData';

const _persistToIDB = async (key: string, value: any): Promise<void> => {
  try {
    const db = await getDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readwrite');
      tx.objectStore(META_STORE).put(JSON.stringify(value), key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('⚠️ Deep Session IDB write failed:', e);
  }
};

const _readFromIDB = async <T = any>(key: string): Promise<T | null> => {
  try {
    const db = await getDB();
    return new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readonly');
      const req = tx.objectStore(META_STORE).get(key);
      req.onsuccess = () => {
        if (req.result != null) {
          try { resolve(JSON.parse(req.result)); } catch { resolve(null); }
        } else { resolve(null); }
      };
      req.onerror = () => reject(req.error);
    });
  } catch { return null; }
};

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

// ===================================================================
// REWARDS ENGINE — حساب المكافآت التصاعدية
// ===================================================================

/**
 * حساب المكافآت بناءً على مدة الجلسة
 * الحد الأدنى (90 دقيقة): 3 دروع + 4 نجوم
 * التصاعد: كل 30 دقيقة إضافية = +1 درع + +1 نجمة
 */
const calculateRewards = (targetMinutes: number, actualMinutes: number, completionPercentage: number): { shields: number; stars: number } => {
  // لا مكافآت إذا أقل من 80%
  if (completionPercentage < 80) {
    return { shields: 0, stars: 0 };
  }

  // الحد الأدنى للمكافآت (90 دقيقة = 3 دروع + 4 نجوم)
  const baseShields = 3;
  const baseStars = 4;

  // حساب الزيادة التصاعدية بناءً على المدة الأصلية المستهدفة
  const extraBlocks = Math.max(0, Math.floor((targetMinutes - 90) / 30));
  const totalShields = baseShields + extraBlocks;
  const totalStars = baseStars + extraBlocks;

  // إذا لم يكمل 100%، تُمنح نسبة من المكافآت
  if (completionPercentage < 100) {
    const factor = completionPercentage / 100;
    return {
      shields: Math.max(1, Math.round(totalShields * factor)),
      stars: Math.max(1, Math.round(totalStars * factor))
    };
  }

  return { shields: totalShields, stars: totalStars };
};

// ===================================================================
// SERVICE API
// ===================================================================

export const deepSessionService = {

  /** قراءة الجلسات مع cache */
  getSessions: (): DeepSession[] => {
    if (_sessionsCache) return [..._sessionsCache];
    const data = localStorage.getItem(STORAGE_KEY);
    _sessionsCache = data ? JSON.parse(data) : [];
    return [..._sessionsCache!];
  },

  /** حفظ الجلسات في كل الطبقات */
  saveSessions: (sessions: DeepSession[]) => {
    _sessionsCache = sessions;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    _persistToIDB(STORAGE_KEY, sessions).catch(() => {});
    _persistToFilesystem('backup_deep_sessions.json', sessions);
  },

  /** إضافة جلسة جديدة + دمج الدقائق مع الكتاب */
  addSession: (session: DeepSession) => {
    const sessions = deepSessionService.getSessions();
    sessions.unshift(session);
    deepSessionService.saveSessions(sessions);

    // ── دمج الدقائق مع الكتاب في storageService ──
    if (session.isCompleted) {
      const actualSeconds = Math.round(session.actualMinutes * 60);
      try {
        const allBooks = storageService.getBooks();
        const bookIdx = allBooks.findIndex((b: any) => b.id === session.bookId);
        if (bookIdx >= 0) {
          allBooks[bookIdx].timeSpentSeconds = (allBooks[bookIdx].timeSpentSeconds || 0) + actualSeconds;
          allBooks[bookIdx].lastReadAt = Date.now();
          allBooks[bookIdx].lastReadDate = new Date().toISOString().split('T')[0];
          storageService.saveBooks(allBooks);
        }
      } catch (e) {
        console.warn('⚠️ Failed to merge deep session time with book:', e);
      }
    }

    // ── مزامنة فورية ──
    deepSessionService.syncSession(session);

    return session;
  },

  /** حذف جلسة بالمعرف */
  deleteSession: (sessionId: string) => {
    const sessions = deepSessionService.getSessions().filter(s => s.id !== sessionId);
    deepSessionService.saveSessions(sessions);
    return sessions;
  },

  /** جلسات كتاب محدد */
  getSessionsByBook: (bookId: string): DeepSession[] => {
    return deepSessionService.getSessions().filter(s => s.bookId === bookId);
  },

  /** إحصائيات تراكمية */
  getStats: (): DeepSessionStats => {
    const sessions = deepSessionService.getSessions();
    const completedSessions = sessions.filter(s => s.isCompleted);
    const perfectSessions = sessions.filter(s => s.isPerfect);

    const totalMinutes = completedSessions.reduce((acc, s) => acc + s.actualMinutes, 0);
    const totalShields = completedSessions.reduce((acc, s) => acc + s.shieldsEarned, 0);
    const totalStars = completedSessions.reduce((acc, s) => acc + s.starsEarned, 0);

    return {
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      totalSessions: sessions.length,
      completedSessions: completedSessions.length,
      perfectSessions: perfectSessions.length,
      completionRate: sessions.length > 0
        ? Math.round((completedSessions.length / sessions.length) * 100)
        : 0,
      totalShieldsEarned: totalShields,
      totalStarsEarned: totalStars
    };
  },

  /** حساب المكافآت */
  calculateRewards,

  /** إنشاء جلسة جديدة */
  createSession: (
    bookId: string,
    bookTitle: string,
    contentHash: string,
    targetMinutes: number,
    actualMinutes: number
  ): DeepSession => {
    const completionPercentage = Math.min(100, Math.round((actualMinutes / targetMinutes) * 100));
    const isCompleted = completionPercentage >= 80;
    const isPerfect = completionPercentage >= 100;
    const rewards = calculateRewards(targetMinutes, actualMinutes, completionPercentage);

    return {
      id: `ds_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      bookId,
      bookTitle,
      contentHash,
      targetMinutes,
      actualMinutes: Math.round(actualMinutes * 10) / 10,
      completionPercentage,
      isCompleted,
      isPerfect,
      shieldsEarned: rewards.shields,
      starsEarned: rewards.stars,
      startedAt: Date.now() - (actualMinutes * 60 * 1000),
      endedAt: Date.now(),
      wasExtended: false,
      extensionCount: 0
    };
  },

  // ===================================================================
  // SYNC — المزامنة السحابية
  // ===================================================================

  /** رفع جلسة فردية فوراً */
  syncSession: async (session: DeepSession) => {
    if (!navigator.onLine) {
      // حفظ في طابور المزامنة
      const queue = deepSessionService.getSyncQueue();
      queue.push(session);
      deepSessionService.saveSyncQueue(queue);
      console.log('📴 Deep session queued for sync');
      return;
    }

    // مزامنة شاملة مع البيانات المحدثة
    try {
      const books = storageService.getBooks();
      const shelves = storageService.getShelves();
      await syncBridge.syncFull(books, shelves, `Deep Session: ${session.bookTitle}`);
      console.log('✅ Deep session synced');
    } catch (e) {
      console.warn('⚠️ Deep session sync failed, queued for later');
      const queue = deepSessionService.getSyncQueue();
      queue.push(session);
      deepSessionService.saveSyncQueue(queue);
    }
  },

  /** طابور المزامنة المحلي */
  getSyncQueue: (): DeepSession[] => {
    try {
      const data = localStorage.getItem(SYNC_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  },

  saveSyncQueue: (queue: DeepSession[]) => {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue.slice(-20)));
  },

  /** رفع الطابور عند عودة الإنترنت */
  flushSyncQueue: async () => {
    const queue = deepSessionService.getSyncQueue();
    if (queue.length === 0) return;

    try {
      const books = storageService.getBooks();
      const shelves = storageService.getShelves();
      await syncBridge.syncFull(books, shelves, 'Deep Session Queue Flush');
      localStorage.removeItem(SYNC_QUEUE_KEY);
      console.log(`✅ Deep session queue flushed (${queue.length} sessions)`);
    } catch {
      console.warn('⚠️ Deep session queue flush failed');
    }
  },

  /** إعداد البيانات للرفع السحابي (تُدمج مع حمولة syncBridge) */
  getPayloadData: () => {
    const stats = deepSessionService.getStats();
    const sessions = deepSessionService.getSessions();
    return {
      totalHours: stats.totalHours,
      totalSessions: stats.totalSessions,
      completionRate: stats.completionRate,
      totalShieldsEarned: stats.totalShieldsEarned,
      totalStarsEarned: stats.totalStarsEarned,
      recentSessions: sessions.slice(0, 20).map(s => ({
        id: s.id,
        bookId: s.bookId,
        bookTitle: s.bookTitle,
        targetMinutes: s.targetMinutes,
        actualMinutes: s.actualMinutes,
        completionPercentage: s.completionPercentage,
        shieldsEarned: s.shieldsEarned,
        starsEarned: s.starsEarned,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        wasExtended: s.wasExtended
      }))
    };
  },

  // ===================================================================
  // RECOVERY — استعادة البيانات
  // ===================================================================
  attemptRecovery: async (): Promise<number> => {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) {
      const parsed = JSON.parse(current);
      if (Array.isArray(parsed) && parsed.length > 0) return 0;
    }

    // Layer 1: IndexedDB
    const idbData = await _readFromIDB<DeepSession[]>(STORAGE_KEY);
    if (Array.isArray(idbData) && idbData.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(idbData));
      _sessionsCache = idbData;
      console.log(`✅ Recovered ${idbData.length} deep sessions from IndexedDB`);
      return idbData.length;
    }

    // Layer 2: Filesystem
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await Filesystem.readFile({
          path: 'backup_deep_sessions.json',
          directory: Directory.Data,
          encoding: 'utf8' as any
        });
        if (result.data && typeof result.data === 'string') {
          const recovered: DeepSession[] = JSON.parse(result.data);
          if (Array.isArray(recovered) && recovered.length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(recovered));
            _sessionsCache = recovered;
            _persistToIDB(STORAGE_KEY, recovered).catch(() => {});
            console.log(`✅ Recovered ${recovered.length} deep sessions from filesystem`);
            return recovered.length;
          }
        }
      } catch { /* non-critical */ }
    }

    return 0;
  }
};

// ── AUTO-FLUSH: رفع الطابور عند عودة الإنترنت ──
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    setTimeout(() => deepSessionService.flushSyncQueue(), 3000);
  });

  // ── PERIODIC INTEGRITY: مزامنة كل 5 دقائق ──
  setInterval(() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          _persistToIDB(STORAGE_KEY, parsed).catch(() => {});
          _persistToFilesystem('backup_deep_sessions.json', parsed);
        }
      }
    } catch {}
  }, 5 * 60 * 1000);
}
