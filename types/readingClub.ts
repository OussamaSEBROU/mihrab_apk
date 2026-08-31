// ══════════════════════════════════════════════════════════════
// READING CLUB TYPES — Extended for real multi-user groups
// ══════════════════════════════════════════════════════════════

// User identity — now backed by server
export interface ClubUserProfile {
  id: string;              // MongoDB _id from server
  deviceId: string;        // Capacitor device ID
  nickname: string;
  avatarIndex: number;     // 0-11
  token: string;           // JWT token for API calls
  recoveryCode?: string;   // shown once on registration
  serverUserId?: string;   // same as id (alias for clarity)
  createdAt: number;
}

// Club types
export type ClubType = 'private' | 'public' | 'personal';
export type ClubStatus = 'active' | 'archived' | 'deleted';
export type SyncStatus = 'synced' | 'pending' | 'failed' | 'local-only';

// Roles — 7 tiers
export type MemberRole = 'owner' | 'full_admin' | 'content_admin' | 'member_admin' | 'discussion_mod' | 'member' | 'readonly';

// 19 granular permissions
export interface MemberPermissions {
  manage_group_info: boolean;
  manage_members: boolean;
  manage_admins: boolean;
  manage_invite_links: boolean;
  post_messages: boolean;
  delete_messages: boolean;
  edit_others_messages: boolean;
  pin_messages: boolean;
  manage_discussions: boolean;
  manage_stages: boolean;
  manage_spoilers: boolean;
  manage_shared_book: boolean;
  manage_book_access: boolean;
  manage_quotes: boolean;
  manage_notifications: boolean;
  view_member_list: boolean;
  view_member_reading_status: boolean;
  archive_group: boolean;
  delete_group: boolean;
}

export interface ReadingClub {
  _id: string;             // MongoDB ID
  id?: string;             // alias
  ownerId: string;
  name: string;
  description: string;
  privacy: ClubType;
  currentBookId?: string;
  currentBookTitle?: string;
  currentBookAuthor?: string;
  bookVisibleToMembers: boolean;
  bookReadableByMembers: boolean;
  sharedQuotesEnabled: boolean;
  stagesEnabled: boolean;
  status: ClubStatus;
  maxMembers: number;
  memberCount: number;
  joinApprovalRequired: boolean;
  welcomeMessage?: string;
  avatarUrl?: string;
  pinnedMessageId?: string;
  inviteVersion: number;
  myRole?: MemberRole;       // populated on /mine
  createdAt: string;
  updatedAt: string;
  // Legacy compat
  type?: ClubType;
  bookId?: string;
  bookTitle?: string;
  bookAuthor?: string;
  syncStatus?: SyncStatus;
}

export type MemberStatus = 'active' | 'muted' | 'banned' | 'left' | 'removed';

export interface ClubMember {
  _id: string;
  groupId: string;
  userId: string | { _id: string; nickname: string; avatarIndex: number };
  nickname?: string;         // populated from userId
  avatarIndex?: number;
  role: MemberRole;
  permissions: MemberPermissions;
  status: MemberStatus;
  mutedUntil?: string;
  joinedAt: string;
  lastSeenAt?: string;
}

export type PostType = 'thought' | 'question' | 'review' | 'quote' | 'announcement' | 'reply';

export interface ClubPost {
  _id: string;
  id?: string;
  groupId: string;
  stageId?: string;
  authorId: string | { _id: string; nickname: string; avatarIndex: number };
  authorNickname?: string;   // extracted from populated authorId
  authorAvatarIndex?: number;
  type: PostType;
  body: string;
  content?: string;          // legacy alias for body
  pageReference?: number;
  chapterReference?: string;
  spoilerLevel: number;       // 0=none, 1=mild, 2=heavy
  containsSpoiler?: boolean;  // legacy compat
  replyToMessageId?: string | { _id: string; body: string; authorId: { nickname: string } };
  isPinned: boolean;
  pinnedBy?: string;
  pinnedAt?: string;
  isEdited: boolean;
  editedAt?: string;
  reactions: Record<string, string[]>;
  visibility: 'visible' | 'hidden' | 'deleted';
  deletedAt?: string;
  clientOperationId?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  syncStatus?: SyncStatus;
  // local-only fields
  _sending?: boolean;
  _failed?: boolean;
}

export interface ClubQuote {
  _id: string;
  groupId: string;
  stageId?: string;
  authorId: string | { _id: string; nickname: string; avatarIndex: number };
  authorNickname?: string;
  quoteText: string;
  pageReference?: number;
  reflection?: string;
  visibility: 'visible' | 'hidden';
  createdAt: string;
}

export interface ClubStage {
  _id: string;
  groupId: string;
  orderIndex: number;
  title: string;
  description?: string;
  pageStart?: number;
  pageEnd?: number;
  chapterReference?: string;
  startsAt?: string;
  endsAt?: string;
  status: 'upcoming' | 'active' | 'completed' | 'archived';
  spoilerLevel: number;
  discussionQuestion?: string;
  discussionOpen: boolean;
  createdAt: string;
}

export interface ClubInvite {
  token: string;              // plain token (returned on create only)
  inviteUrl: string;          // mihrab://club/invite/{token}
  expiresAt?: string;
  maxUses: number;
}

export interface ClubInvitePreviewData {
  valid: boolean;
  reason?: string;
  group?: {
    name: string;
    description: string;
    privacy: ClubType;
    memberCount: number;
    currentBookTitle?: string;
    avatarUrl?: string;
  };
  inviteId?: string;
}

export interface JoinRequestData {
  _id: string;
  groupId: string;
  userId: { _id: string; nickname: string; avatarIndex: number };
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface AuditLogEntry {
  _id: string;
  groupId: string;
  actorId: { _id: string; nickname: string };
  action: string;
  details?: any;
  createdAt: string;
}

// Internal navigation within Reading Club
export type ClubView = 'list' | 'create' | 'page' | 'stages' | 'discussion' | 'quotes' | 'members' | 'settings' | 'admin' | 'audit' | 'invite-preview' | 'profile-setup';

// Helper to extract nickname from populated userId
export function getMemberNickname(member: ClubMember): string {
  if (typeof member.userId === 'object' && member.userId.nickname) return member.userId.nickname;
  return member.nickname || 'Unknown';
}
export function getMemberAvatar(member: ClubMember): number {
  if (typeof member.userId === 'object' && member.userId.avatarIndex !== undefined) return member.userId.avatarIndex;
  return member.avatarIndex || 0;
}
export function getMemberId(member: ClubMember): string {
  if (typeof member.userId === 'object') return member.userId._id;
  return member.userId;
}
export function getPostAuthorNickname(post: ClubPost): string {
  if (typeof post.authorId === 'object' && post.authorId.nickname) return post.authorId.nickname;
  return post.authorNickname || 'Unknown';
}
export function getPostAuthorAvatar(post: ClubPost): number {
  if (typeof post.authorId === 'object' && post.authorId.avatarIndex !== undefined) return post.authorId.avatarIndex;
  return post.authorAvatarIndex || 0;
}
export function getPostAuthorId(post: ClubPost): string {
  if (typeof post.authorId === 'object') return post.authorId._id;
  return post.authorId;
}
