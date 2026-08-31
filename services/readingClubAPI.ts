// ══════════════════════════════════════════════════════════════
// READING CLUB API — HTTP layer for all backend calls
// ══════════════════════════════════════════════════════════════

import { readingClubAuth } from './readingClubAuth';
import type {
  ReadingClub, ClubMember, ClubPost, ClubQuote, ClubStage,
  ClubInvite, ClubInvitePreviewData, JoinRequestData, AuditLogEntry
} from '../types/readingClub';

const api = readingClubAuth.apiCall;

// ══════════════════════════════════════════════════════════════
// GROUPS
// ══════════════════════════════════════════════════════════════
export const clubGroupsAPI = {
  create: async (data: {
    name: string; description?: string; privacy?: string;
    maxMembers?: number; joinApprovalRequired?: boolean; welcomeMessage?: string;
    currentBookId?: string; currentBookTitle?: string; currentBookAuthor?: string;
    bookVisibleToMembers?: boolean; bookReadableByMembers?: boolean;
  }) => api<{ group: ReadingClub; member: ClubMember }>('/groups', {
    method: 'POST', body: JSON.stringify(data)
  }),

  getMyGroups: async () =>
    api<ReadingClub[]>('/groups/mine', { method: 'GET' }),

  getGroup: async (groupId: string) =>
    api<{ group: ReadingClub; memberCount: number }>(`/groups/${groupId}`, { method: 'GET' }),

  updateGroup: async (groupId: string, data: Partial<ReadingClub>) =>
    api<ReadingClub>(`/groups/${groupId}`, {
      method: 'PUT', body: JSON.stringify(data)
    }),

  deleteGroup: async (groupId: string) =>
    api<{ success: boolean }>(`/groups/${groupId}`, { method: 'DELETE' }),

  getUpdates: async (groupId: string, since: number) =>
    api<{ group: ReadingClub | null; members: ClubMember[]; messages: ClubPost[]; quotes: ClubQuote[]; stages: ClubStage[] }>(
      `/groups/${groupId}/updates?since=${since}`, { method: 'GET' }
    ),
};

// ══════════════════════════════════════════════════════════════
// MEMBERS
// ══════════════════════════════════════════════════════════════
export const clubMembersAPI = {
  list: async (groupId: string) =>
    api<ClubMember[]>(`/groups/${groupId}/members`, { method: 'GET' }),

  changeRole: async (groupId: string, userId: string, role: string, permissions?: any) =>
    api<ClubMember>(`/groups/${groupId}/members/${userId}/role`, {
      method: 'PUT', body: JSON.stringify({ role, permissions })
    }),

  updatePermissions: async (groupId: string, userId: string, permissions: any) =>
    api<ClubMember>(`/groups/${groupId}/members/${userId}/permissions`, {
      method: 'PUT', body: JSON.stringify({ permissions })
    }),

  removeMember: async (groupId: string, userId: string) =>
    api<{ success: boolean }>(`/groups/${groupId}/members/${userId}`, { method: 'DELETE' }),

  muteMember: async (groupId: string, userId: string, duration: number, reason?: string) =>
    api<{ success: boolean }>(`/groups/${groupId}/members/${userId}/mute`, {
      method: 'PUT', body: JSON.stringify({ duration, reason })
    }),

  unmuteMember: async (groupId: string, userId: string) =>
    api<{ success: boolean }>(`/groups/${groupId}/members/${userId}/unmute`, { method: 'PUT' }),

  banMember: async (groupId: string, userId: string, reason?: string) =>
    api<{ success: boolean }>(`/groups/${groupId}/members/${userId}/ban`, {
      method: 'PUT', body: JSON.stringify({ reason })
    }),

  leaveGroup: async (groupId: string) =>
    api<{ success: boolean }>(`/groups/${groupId}/members/leave`, { method: 'POST' }),
};

// ══════════════════════════════════════════════════════════════
// INVITES
// ══════════════════════════════════════════════════════════════
export const clubInvitesAPI = {
  create: async (groupId: string, expiresIn = 0, maxUses = 0) =>
    api<ClubInvite>(`/invites/${groupId}/create`, {
      method: 'POST', body: JSON.stringify({ expiresIn, maxUses })
    }),

  preview: async (token: string) => {
    // Preview is public — no auth needed, but use apiCall for retry logic
    try {
      await readingClubAuth.wakeUpServer();
      const resp = await fetch(`${readingClubAuth.API_BASE}/invites/preview/${token}`, {
        signal: AbortSignal.timeout(30000)
      });
      const data = await resp.json();
      return { ok: true, data: data as ClubInvitePreviewData };
    } catch (e: any) {
      return { ok: false, error: e.message, data: undefined };
    }
  },

  join: async (token: string) =>
    api<{ status: string; member?: ClubMember; group?: ReadingClub; message?: string }>(
      `/invites/join/${token}`, { method: 'POST' }
    ),

  revoke: async (groupId: string, inviteId: string) =>
    api<{ success: boolean }>(`/invites/${groupId}/revoke/${inviteId}`, { method: 'DELETE' }),

  list: async (groupId: string) =>
    api<any[]>(`/invites/${groupId}/list`, { method: 'GET' }),

  getJoinRequests: async (groupId: string) =>
    api<JoinRequestData[]>(`/invites/${groupId}/join-requests`, { method: 'GET' }),

  handleJoinRequest: async (groupId: string, requestId: string, action: 'approve' | 'reject') =>
    api<{ success: boolean }>(`/invites/${groupId}/join-requests/${requestId}`, {
      method: 'PUT', body: JSON.stringify({ action })
    }),
};

// ══════════════════════════════════════════════════════════════
// MESSAGES
// ══════════════════════════════════════════════════════════════
export const clubMessagesAPI = {
  list: async (groupId: string, cursor?: string, limit = 30, stageId?: string) => {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    params.set('limit', limit.toString());
    if (stageId) params.set('stageId', stageId);
    return api<{ messages: ClubPost[]; hasMore: boolean; nextCursor: string | null }>(
      `/groups/${groupId}/messages?${params}`, { method: 'GET' }
    );
  },

  send: async (groupId: string, data: {
    body: string; type?: string; pageReference?: number; chapterReference?: string;
    spoilerLevel?: number; replyToMessageId?: string; stageId?: string; clientOperationId?: string;
  }) => api<ClubPost>(`/groups/${groupId}/messages`, {
    method: 'POST', body: JSON.stringify(data)
  }),

  edit: async (groupId: string, messageId: string, body: string, spoilerLevel?: number) =>
    api<ClubPost>(`/groups/${groupId}/messages/${messageId}`, {
      method: 'PUT', body: JSON.stringify({ body, spoilerLevel })
    }),

  delete: async (groupId: string, messageId: string, reason?: string) =>
    api<{ success: boolean }>(`/groups/${groupId}/messages/${messageId}`, {
      method: 'DELETE', body: reason ? JSON.stringify({ reason }) : undefined
    }),

  pin: async (groupId: string, messageId: string) =>
    api<ClubPost>(`/groups/${groupId}/messages/${messageId}/pin`, { method: 'POST' }),

  react: async (groupId: string, messageId: string, emoji: string) =>
    api<Record<string, string[]>>(`/groups/${groupId}/messages/${messageId}/react`, {
      method: 'POST', body: JSON.stringify({ emoji })
    }),

  report: async (groupId: string, messageId: string, reason: string) =>
    api<{ success: boolean }>(`/groups/${groupId}/messages/${messageId}/report`, {
      method: 'POST', body: JSON.stringify({ reason })
    }),
};

// ══════════════════════════════════════════════════════════════
// BOOK
// ══════════════════════════════════════════════════════════════
export const clubBookAPI = {
  get: async (groupId: string) =>
    api<any>(`/groups/${groupId}/book`, { method: 'GET' }),

  set: async (groupId: string, data: {
    currentBookId?: string; currentBookTitle: string; currentBookAuthor?: string;
    bookVisibleToMembers?: boolean; bookReadableByMembers?: boolean;
    sharedQuotesEnabled?: boolean; stagesEnabled?: boolean;
  }) => api<any>(`/groups/${groupId}/book`, {
    method: 'PUT', body: JSON.stringify(data)
  }),

  remove: async (groupId: string) =>
    api<{ success: boolean }>(`/groups/${groupId}/book`, { method: 'DELETE' }),

  checkAccess: async (groupId: string) =>
    api<{ canView: boolean; canRead: boolean; canShareQuotes: boolean }>(
      `/groups/${groupId}/book/access`, { method: 'GET' }
    ),
};

// ══════════════════════════════════════════════════════════════
// STAGES
// ══════════════════════════════════════════════════════════════
export const clubStagesAPI = {
  list: async (groupId: string) =>
    api<ClubStage[]>(`/groups/${groupId}/stages`, { method: 'GET' }),

  create: async (groupId: string, data: Partial<ClubStage>) =>
    api<ClubStage>(`/groups/${groupId}/stages`, {
      method: 'POST', body: JSON.stringify(data)
    }),

  update: async (groupId: string, stageId: string, data: Partial<ClubStage>) =>
    api<ClubStage>(`/groups/${groupId}/stages/${stageId}`, {
      method: 'PUT', body: JSON.stringify(data)
    }),

  delete: async (groupId: string, stageId: string) =>
    api<{ success: boolean }>(`/groups/${groupId}/stages/${stageId}`, { method: 'DELETE' }),
};

// ══════════════════════════════════════════════════════════════
// QUOTES
// ══════════════════════════════════════════════════════════════
export const clubQuotesAPI = {
  list: async (groupId: string, cursor?: string, limit = 20) => {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    params.set('limit', limit.toString());
    return api<{ quotes: ClubQuote[]; hasMore: boolean; nextCursor: string | null }>(
      `/groups/${groupId}/quotes?${params}`, { method: 'GET' }
    );
  },

  add: async (groupId: string, data: { quoteText: string; pageReference?: number; reflection?: string; stageId?: string }) =>
    api<ClubQuote>(`/groups/${groupId}/quotes`, {
      method: 'POST', body: JSON.stringify(data)
    }),

  delete: async (groupId: string, quoteId: string) =>
    api<{ success: boolean }>(`/groups/${groupId}/quotes/${quoteId}`, { method: 'DELETE' }),
};

// ══════════════════════════════════════════════════════════════
// AUDIT LOG
// ══════════════════════════════════════════════════════════════
export const clubAuditAPI = {
  list: async (groupId: string, cursor?: string, limit = 30) => {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    params.set('limit', limit.toString());
    return api<{ entries: AuditLogEntry[]; hasMore: boolean; nextCursor: string | null }>(
      `/groups/${groupId}/audit?${params}`, { method: 'GET' }
    );
  },
};
