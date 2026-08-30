import { readingClubStorage } from './readingClubStorage';
import type { ReadingClub, ClubPost, ClubQuote } from '../types/readingClub';

const CLUB_API_BASE = 'https://mihrabadminv2.onrender.com/api/clubs';

let isSyncing = false;

const _wakeUpServer = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${CLUB_API_BASE}/health`, { method: 'GET', signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch (e) {
    return false;
  }
};

const _flushQueue = async () => {
  if (isSyncing || !navigator.onLine) return;
  
  const queue = readingClubStorage.getPendingQueue();
  if (queue.length === 0) return;
  
  isSyncing = true;
  
  try {
    const isAwake = await _wakeUpServer();
    if (!isAwake) {
      console.log('[ClubSync] Server asleep, will retry queue later');
      isSyncing = false;
      return;
    }

    const remainingQueue = [];
    
    for (const item of queue) {
      if (item.retryCount > 5) {
        console.warn('[ClubSync] Dropping item after max retries:', item);
        continue;
      }
      
      try {
        console.log(`[ClubSync] Mock syncing item type: ${item.type}`, item);
        const res = await fetch(`${CLUB_API_BASE}/${item.endpoint}`, {
          method: item.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(item.payload),
          signal: AbortSignal.timeout(5000)
        });
        
        if (!res.ok) {
          throw new Error(`Sync failed with status: ${res.status}`);
        }
      } catch (err) {
        console.warn(`[ClubSync] Sync error for item:`, err);
        item.retryCount++;
        remainingQueue.push(item);
      }
    }
    
    readingClubStorage.updatePendingQueue(remainingQueue);
  } catch (error) {
    console.error('[ClubSync] Queue flush error', error);
  } finally {
    isSyncing = false;
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('online', _flushQueue);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      _flushQueue();
    }
  });
}

export const readingClubSync = {
  syncClub: async (club: ReadingClub) => {
    console.log('[ClubSync] syncClub called for:', club.id);
    readingClubStorage.addToPendingQueue({
      type: 'club',
      endpoint: 'sync',
      method: 'POST',
      payload: club
    });
    
    readingClubStorage.updateClub({...club, syncStatus: 'pending'});
    _flushQueue();
  },
  
  syncPost: async (post: ClubPost) => {
    console.log('[ClubSync] syncPost called for:', post.id);
    readingClubStorage.addToPendingQueue({
      type: 'post',
      endpoint: `posts/${post.id}`,
      method: 'POST',
      payload: post
    });
    
    _flushQueue();
  },
  
  syncQuote: async (quote: ClubQuote) => {
    console.log('[ClubSync] syncQuote called for:', quote.id);
    readingClubStorage.addToPendingQueue({
      type: 'quote',
      endpoint: `quotes/${quote.id}`,
      method: 'POST',
      payload: quote
    });
    
    _flushQueue();
  },
  
  fetchClubUpdates: async (clubId: string) => {
    console.log('[ClubSync] fetchClubUpdates called for:', clubId);
    if (!navigator.onLine) return null;
    
    try {
      const res = await fetch(`${CLUB_API_BASE}/${clubId}`, {
        signal: AbortSignal.timeout(5000)
      });
      
      if (!res.ok) {
        console.log('[ClubSync] Fetch failed (expected as endpoints missing)', res.status);
        return null;
      }
      
      return await res.json();
    } catch (err) {
      console.log('[ClubSync] Fetch error (expected as endpoints missing)', err);
      return null;
    }
  }
};
