import { getDB } from './pdfStorage';
import type { 
  ClubUserProfile, ReadingClub, ClubMember, ClubStage, 
  ClubPost, ClubQuote, ClubInvitation 
} from '../types/readingClub';

const PREFIX = 'sanctuary_club_';
const PROFILE_KEY = `${PREFIX}profile`;
const CLUBS_KEY = `${PREFIX}clubs`;
const MEMBERS_KEY = `${PREFIX}members_`;
const STAGES_KEY = `${PREFIX}stages_`;
const POSTS_KEY = `${PREFIX}posts_`;
const QUOTES_KEY = `${PREFIX}quotes_`;
const PENDING_QUEUE_KEY = `${PREFIX}pending_queue`;

// Persist data asynchronously to IndexedDB
const _persistToIDB = async (key: string, value: any) => {
  try {
    const db = await getDB();
    if (!db) return;
    
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(['AppData'], 'readwrite');
      const store = transaction.objectStore('AppData');
      
      const request = store.put({
        id: key,
        data: value,
        timestamp: Date.now()
      });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn(`[ClubStorage] Failed to persist ${key} to IDB`, error);
  }
};

const _saveAndPersist = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    _persistToIDB(key, value);
  } catch (e) {
    console.error(`[ClubStorage] Error saving ${key}`, e);
  }
};

const _get = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`[ClubStorage] Error reading ${key}`, e);
    return defaultValue;
  }
};

export const readingClubStorage = {
  // User Profile
  getUserProfile: (): ClubUserProfile | null => {
    return _get<ClubUserProfile | null>(PROFILE_KEY, null);
  },
  
  saveUserProfile: (profile: ClubUserProfile): void => {
    _saveAndPersist(PROFILE_KEY, profile);
  },
  
  hasProfile: (): boolean => {
    return !!localStorage.getItem(PROFILE_KEY);
  },

  // Clubs
  getClubs: (): ReadingClub[] => {
    return _get<ReadingClub[]>(CLUBS_KEY, []);
  },

  getUserClubs: (userId: string): ReadingClub[] => {
    return _get<ReadingClub[]>(CLUBS_KEY, []);
  },
  
  saveClubs: (clubs: ReadingClub[]): void => {
    _saveAndPersist(CLUBS_KEY, clubs);
  },
  
  addClub: (club: ReadingClub): void => {
    const clubs = readingClubStorage.getClubs();
    const existing = clubs.findIndex(c => c.id === club.id);
    if (existing >= 0) {
      clubs[existing] = club;
    } else {
      clubs.push(club);
    }
    readingClubStorage.saveClubs(clubs);
  },
  
  updateClub: (club: ReadingClub): void => {
    readingClubStorage.addClub(club);
  },
  
  deleteClub: (clubId: string): void => {
    const clubs = readingClubStorage.getClubs().filter(c => c.id !== clubId);
    readingClubStorage.saveClubs(clubs);
    
    // Also remove related data
    localStorage.removeItem(`${MEMBERS_KEY}${clubId}`);
    localStorage.removeItem(`${STAGES_KEY}${clubId}`);
    localStorage.removeItem(`${POSTS_KEY}${clubId}`);
    localStorage.removeItem(`${QUOTES_KEY}${clubId}`);
  },

  // Members
  getClubMembers: (clubId: string): ClubMember[] => {
    return _get<ClubMember[]>(`${MEMBERS_KEY}${clubId}`, []);
  },
  
  addMember: (member: ClubMember): void => {
    const members = readingClubStorage.getClubMembers(member.clubId);
    const existing = members.findIndex(m => m.id === member.id);
    if (existing >= 0) {
      members[existing] = member;
    } else {
      members.push(member);
    }
    _saveAndPersist(`${MEMBERS_KEY}${member.clubId}`, members);
  },
  
  removeMember: (clubId: string, memberId: string): void => {
    const members = readingClubStorage.getClubMembers(clubId).filter(m => m.id !== memberId);
    _saveAndPersist(`${MEMBERS_KEY}${clubId}`, members);
  },

  // Stages
  getClubStages: (clubId: string): ClubStage[] => {
    return _get<ClubStage[]>(`${STAGES_KEY}${clubId}`, []);
  },
  
  saveStages: (clubId: string, stages: ClubStage[]): void => {
    _saveAndPersist(`${STAGES_KEY}${clubId}`, stages);
  },

  // Posts
  getClubPosts: (clubId: string): ClubPost[] => {
    return _get<ClubPost[]>(`${POSTS_KEY}${clubId}`, []);
  },
  
  addPost: (post: ClubPost): void => {
    const posts = readingClubStorage.getClubPosts(post.clubId);
    posts.push(post);
    _saveAndPersist(`${POSTS_KEY}${post.clubId}`, posts);
  },
  
  deletePost: (clubId: string, postId: string): void => {
    const posts = readingClubStorage.getClubPosts(clubId).filter(p => p.id !== postId);
    _saveAndPersist(`${POSTS_KEY}${clubId}`, posts);
  },

  // Quotes
  getClubQuotes: (clubId: string): ClubQuote[] => {
    return _get<ClubQuote[]>(`${QUOTES_KEY}${clubId}`, []);
  },
  
  addQuote: (quote: ClubQuote): void => {
    const quotes = readingClubStorage.getClubQuotes(quote.clubId);
    quotes.push(quote);
    _saveAndPersist(`${QUOTES_KEY}${quote.clubId}`, quotes);
  },

  // Pending Queue for Sync
  getPendingQueue: (): any[] => {
    return _get<any[]>(PENDING_QUEUE_KEY, []);
  },
  
  addToPendingQueue: (item: any): void => {
    const queue = readingClubStorage.getPendingQueue();
    queue.push({
      ...item,
      queuedAt: Date.now(),
      retryCount: 0
    });
    _saveAndPersist(PENDING_QUEUE_KEY, queue);
  },
  
  clearPendingQueue: (): void => {
    _saveAndPersist(PENDING_QUEUE_KEY, []);
  },
  
  updatePendingQueue: (queue: any[]): void => {
    _saveAndPersist(PENDING_QUEUE_KEY, queue);
  }
};
