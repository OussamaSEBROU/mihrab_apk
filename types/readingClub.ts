// User identity (local-first, no account system)
export interface ClubUserProfile {
  id: string;              // device ID from syncBridge.getDeviceId()
  nickname: string;        // chosen by user on first club access
  avatarIndex: number;     // index into a predefined avatar list (0-11)
  createdAt: number;
}

// Club types
export type ClubType = 'private' | 'public' | 'personal';
export type ClubStatus = 'upcoming' | 'active' | 'completed' | 'archived';
export type SyncStatus = 'synced' | 'pending' | 'failed' | 'local-only';

export interface ReadingClub {
  id: string;
  ownerId: string;         // ClubUserProfile.id
  name: string;
  description: string;
  type: ClubType;
  bookId?: string;         // reference to existing book (no copy)
  bookTitle?: string;      // display title
  bookAuthor?: string;     // display author
  topic?: string;          // if no book
  status: ClubStatus;
  maxMembers: number;
  joinApprovalRequired: boolean;
  startDate: string;       // ISO date
  endDate?: string;
  createdAt: number;
  updatedAt: number;
  syncStatus: SyncStatus;
  version: number;
  inviteCode?: string;     // for private clubs
}

export interface ClubMember {
  id: string;              // unique member entry ID
  clubId: string;
  userId: string;          // ClubUserProfile.id
  nickname: string;
  avatarIndex: number;
  role: 'owner' | 'admin' | 'member';
  joinedAt: number;
  currentStage?: number;   // which stage they're on
  lastActiveAt: number;
}

export interface ClubStage {
  id: string;
  clubId: string;
  stageNumber: number;
  title: string;
  fromPage?: number;
  toPage?: number;
  startDate?: string;      // ISO date
  endDate?: string;
  isCompleted: boolean;
}

export type PostType = 'thought' | 'question' | 'review' | 'quote';

export interface ClubPost {
  id: string;
  clubId: string;
  stageId?: string;        // which stage this belongs to
  authorId: string;        // ClubUserProfile.id
  authorNickname: string;
  authorAvatarIndex: number;
  type: PostType;
  content: string;
  pageReference?: number;
  containsSpoiler: boolean;
  reactions: Record<string, string[]>; // emoji -> userId[]
  createdAt: number;
  updatedAt: number;
  syncStatus: SyncStatus;
}

export interface ClubQuote {
  id: string;
  clubId: string;
  stageId?: string;
  authorId: string;
  authorNickname: string;
  quoteText: string;
  pageNumber?: number;
  note?: string;           // personal comment on the quote
  createdAt: number;
  syncStatus: SyncStatus;
}

export interface ClubInvitation {
  id: string;
  clubId: string;
  clubName: string;
  inviteCode: string;
  invitedBy: string;       // nickname
  createdAt: number;
  expiresAt?: number;
  used: boolean;
}

// Internal navigation within Reading Club
export type ClubView = 'list' | 'create' | 'page' | 'stages' | 'discussion' | 'quotes' | 'members' | 'settings' | 'profile-setup';
