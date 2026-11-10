// ══════════════════════════════════════════════════════════════
// CHALLENGE SERVICE — PIN-based Book Competition Engine
// Uses existing Reading Club API (groups + messages) as backend
// ══════════════════════════════════════════════════════════════

import { readingClubAuth } from './readingClubAuth';
import { clubGroupsAPI, clubInvitesAPI, clubMembersAPI, clubMessagesAPI } from './readingClubAPI';
import { readingClubSync } from './readingClubSync';
import type {
  BookChallenge, ChallengeIdentity, ChallengeParticipant,
  ChallengeProgressMessage
} from '../types/challenge';

const CHALLENGES_KEY = 'sanctuary_challenges';
const CHALLENGE_IDENTITY_KEY = 'sanctuary_challenge_identity';

// ══════════════════════════════════════════════════════════════
// PIN GENERATION — 6-digit numeric code derived from invite token
// ══════════════════════════════════════════════════════════════
function generatePinFromToken(token: string): string {
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    hash = ((hash << 5) - hash) + token.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  const pin = Math.abs(hash % 900000) + 100000; // 6-digit: 100000-999999
  return pin.toString();
}

// ══════════════════════════════════════════════════════════════
// LOCAL STORAGE
// ══════════════════════════════════════════════════════════════
function getChallenges(): BookChallenge[] {
  try {
    const data = localStorage.getItem(CHALLENGES_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveChallenges(challenges: BookChallenge[]) {
  localStorage.setItem(CHALLENGES_KEY, JSON.stringify(challenges));
}

function getIdentity(): ChallengeIdentity | null {
  try {
    const data = localStorage.getItem(CHALLENGE_IDENTITY_KEY);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

function saveIdentity(identity: ChallengeIdentity) {
  localStorage.setItem(CHALLENGE_IDENTITY_KEY, JSON.stringify(identity));
}

// ══════════════════════════════════════════════════════════════
// CHALLENGE PROGRESS MESSAGE HELPERS
// ══════════════════════════════════════════════════════════════
function isProgressMessage(body: string): ChallengeProgressMessage | null {
  try {
    const parsed = JSON.parse(body);
    if (parsed && parsed._isChallengeProgress) return parsed;
  } catch {}
  return null;
}

function buildProgressPayload(
  identity: ChallengeIdentity,
  currentPage: number,
  totalPages: number,
  readingMinutes: number,
  stars: number
): string {
  const msg: ChallengeProgressMessage = {
    _isChallengeProgress: true,
    name: identity.name,
    country: identity.country,
    currentPage,
    totalPages,
    percentComplete: totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0,
    readingMinutes,
    stars,
    timestamp: Date.now()
  };
  return JSON.stringify(msg);
}

// ══════════════════════════════════════════════════════════════
// EXPORTED CHALLENGE SERVICE
// ══════════════════════════════════════════════════════════════
export const challengeService = {
  // ─── Identity Management ────────────────────────────────────
  getIdentity,
  saveIdentity,

  hasIdentity: (): boolean => !!getIdentity(),

  // ─── Challenge CRUD ─────────────────────────────────────────
  getChallenges,

  getChallengeForBook: (bookId: string): BookChallenge | null => {
    return getChallenges().find(c => c.bookId === bookId) || null;
  },

  getChallengeByPin: (pin: string): BookChallenge | null => {
    return getChallenges().find(c => c.pin === pin) || null;
  },

  // ─── Create Challenge ───────────────────────────────────────
  createChallenge: async (
    identity: ChallengeIdentity,
    bookId: string,
    bookTitle: string,
    bookAuthor: string
  ): Promise<{ success: boolean; challenge?: BookChallenge; pin?: string; error?: string }> => {
    try {
      // Ensure user is registered with Reading Club system
      if (!readingClubAuth.isLoggedIn()) {
        const regResult = await readingClubAuth.register(identity.name, 0);
        if (!regResult.success) {
          return { success: false, error: regResult.error || 'Registration failed' };
        }
      }

      // Update profile nickname to match challenge identity
      await readingClubAuth.updateProfile({ nickname: identity.name });

      // Create a private group for this challenge
      const groupResult = await clubGroupsAPI.create({
        name: `📖 ${bookTitle}`,
        description: `منافسة كتاب: ${bookTitle} — ${bookAuthor}`,
        privacy: 'private',
        maxMembers: 50,
        joinApprovalRequired: false,
        currentBookId: bookId,
        currentBookTitle: bookTitle,
        currentBookAuthor: bookAuthor,
      });

      if (!groupResult.ok || !groupResult.data) {
        return { success: false, error: groupResult.error || 'Failed to create challenge' };
      }

      const group = groupResult.data.group;

      // Generate invite link
      const inviteResult = await clubInvitesAPI.create(group._id, 0, 0);
      if (!inviteResult.ok || !inviteResult.data) {
        return { success: false, error: 'Failed to generate challenge PIN' };
      }

      const token = inviteResult.data.token;
      const pin = generatePinFromToken(token);

      // Save identity
      saveIdentity(identity);

      // Create local challenge record
      const challenge: BookChallenge = {
        id: group._id,
        pin,
        bookId,
        bookTitle,
        bookAuthor,
        creatorName: identity.name,
        creatorCountry: identity.country,
        createdAt: Date.now(),
        participants: [{
          userId: readingClubAuth.getLocalProfile()?.id || '',
          name: identity.name,
          country: identity.country,
          currentPage: 0,
          totalPages: 0,
          percentComplete: 0,
          readingMinutes: 0,
          stars: 0,
          lastUpdated: Date.now(),
          score: 0,
        }],
        isOwner: true,
        inviteToken: token,
        lastSyncedAt: Date.now(),
      };

      const challenges = getChallenges();
      // Remove any existing challenge for this book
      const filtered = challenges.filter(c => c.bookId !== bookId);
      filtered.push(challenge);
      saveChallenges(filtered);

      // Send initial progress message
      await clubMessagesAPI.send(group._id, {
        body: buildProgressPayload(identity, 0, 0, 0, 0),
        type: 'announcement',
      });

      return { success: true, challenge, pin };
    } catch (e: any) {
      return { success: false, error: e.message || 'Unknown error' };
    }
  },

  // ─── Join Challenge ─────────────────────────────────────────
  joinChallenge: async (
    identity: ChallengeIdentity,
    pin: string,
    bookId: string
  ): Promise<{ success: boolean; challenge?: BookChallenge; error?: string }> => {
    try {
      // Ensure user is registered
      if (!readingClubAuth.isLoggedIn()) {
        const regResult = await readingClubAuth.register(identity.name, 0);
        if (!regResult.success) {
          return { success: false, error: regResult.error || 'Registration failed' };
        }
      }

      await readingClubAuth.updateProfile({ nickname: identity.name });

      // We need to find the challenge by PIN
      // The PIN was derived from the invite token
      // Since we can't reverse the PIN, the user needs the full invite token
      // OR we search through our known challenges

      // First check if we already have this PIN locally (from sharing)
      const localChallenge = getChallenges().find(c => c.pin === pin);
      let inviteToken = localChallenge?.inviteToken || '';

      // If no local match, the PIN is the entry code shared verbally
      // We need the invite token - store PIN→token mapping
      const pinMapStr = localStorage.getItem('sanctuary_pin_map');
      const pinMap: Record<string, string> = pinMapStr ? JSON.parse(pinMapStr) : {};
      
      if (!inviteToken && pinMap[pin]) {
        inviteToken = pinMap[pin];
      }

      if (!inviteToken) {
        // Try using PIN directly as a short code (the user may paste the full token)
        inviteToken = pin;
      }

      // Attempt to join using the invite token
      const joinResult = await clubInvitesAPI.join(inviteToken);
      if (!joinResult.ok || !joinResult.data) {
        return { success: false, error: joinResult.error || 'Invalid challenge PIN' };
      }

      const joinData = joinResult.data;
      if (joinData.status === 'error') {
        return { success: false, error: joinData.message || 'Could not join challenge' };
      }

      const group = joinData.group;
      if (!group) {
        return { success: false, error: 'Challenge not found' };
      }

      // Verify same book
      if (group.currentBookId && group.currentBookId !== bookId) {
        return { success: false, error: 'ar' === 'ar'
          ? 'هذه المنافسة لكتاب مختلف. تأكد أنك تملك نفس الكتاب.'
          : 'This challenge is for a different book.' };
      }

      saveIdentity(identity);

      // Create local challenge record
      const challenge: BookChallenge = {
        id: group._id,
        pin,
        bookId,
        bookTitle: group.currentBookTitle || group.name || '',
        bookAuthor: group.currentBookAuthor || '',
        creatorName: '',
        creatorCountry: '',
        createdAt: new Date(group.createdAt).getTime(),
        participants: [],
        isOwner: false,
        inviteToken,
        lastSyncedAt: Date.now(),
      };

      const challenges = getChallenges();
      const filtered = challenges.filter(c => c.bookId !== bookId);
      filtered.push(challenge);
      saveChallenges(filtered);

      // Send join progress message
      await clubMessagesAPI.send(group._id, {
        body: buildProgressPayload(identity, 0, 0, 0, 0),
        type: 'announcement',
      });

      return { success: true, challenge };
    } catch (e: any) {
      return { success: false, error: e.message || 'Unknown error' };
    }
  },

  // ─── Sync Progress ──────────────────────────────────────────
  syncProgress: async (
    bookId: string,
    currentPage: number,
    totalPages: number,
    readingMinutes: number,
    stars: number
  ): Promise<void> => {
    const challenge = getChallenges().find(c => c.bookId === bookId);
    if (!challenge) return;

    const identity = getIdentity();
    if (!identity) return;

    try {
      await clubMessagesAPI.send(challenge.id, {
        body: buildProgressPayload(identity, currentPage, totalPages, readingMinutes, stars),
        type: 'thought',
      });

      // Update local record
      const userId = readingClubAuth.getLocalProfile()?.id || '';
      const percentComplete = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;
      const score = readingMinutes + percentComplete;

      const myParticipant: ChallengeParticipant = {
        userId,
        name: identity.name,
        country: identity.country,
        currentPage,
        totalPages,
        percentComplete,
        readingMinutes,
        stars,
        lastUpdated: Date.now(),
        score,
      };

      const challenges = getChallenges();
      const idx = challenges.findIndex(c => c.bookId === bookId);
      if (idx !== -1) {
        const existing = challenges[idx].participants.findIndex(p => p.userId === userId);
        if (existing !== -1) {
          challenges[idx].participants[existing] = myParticipant;
        } else {
          challenges[idx].participants.push(myParticipant);
        }
        challenges[idx].lastSyncedAt = Date.now();
        saveChallenges(challenges);
      }
    } catch (e) {
      console.warn('[Challenge] Progress sync failed:', e);
    }
  },

  // ─── Fetch Leaderboard ──────────────────────────────────────
  fetchLeaderboard: async (bookId: string): Promise<ChallengeParticipant[]> => {
    const challenge = getChallenges().find(c => c.bookId === bookId);
    if (!challenge) return [];

    try {
      // Fetch messages from the challenge group to build leaderboard
      const messagesResult = await clubMessagesAPI.list(challenge.id, undefined, 200);
      if (!messagesResult.ok || !messagesResult.data?.messages) {
        return challenge.participants.sort((a, b) => b.score - a.score);
      }

      // Parse progress messages — keep only latest per user
      const latestByUser = new Map<string, ChallengeParticipant>();

      for (const msg of messagesResult.data.messages) {
        const progress = isProgressMessage(msg.body || '');
        if (!progress) continue;

        const authorId = typeof msg.authorId === 'object' ? msg.authorId._id : msg.authorId;
        const existing = latestByUser.get(authorId);

        if (!existing || progress.timestamp > existing.lastUpdated) {
          latestByUser.set(authorId, {
            userId: authorId,
            name: progress.name,
            country: progress.country,
            currentPage: progress.currentPage,
            totalPages: progress.totalPages,
            percentComplete: progress.percentComplete,
            readingMinutes: progress.readingMinutes,
            stars: progress.stars,
            lastUpdated: progress.timestamp,
            score: progress.readingMinutes + progress.percentComplete,
          });
        }
      }

      const participants = Array.from(latestByUser.values())
        .sort((a, b) => b.score - a.score);

      // Update local cache
      const challenges = getChallenges();
      const idx = challenges.findIndex(c => c.bookId === bookId);
      if (idx !== -1) {
        challenges[idx].participants = participants;
        challenges[idx].lastSyncedAt = Date.now();
        saveChallenges(challenges);
      }

      return participants;
    } catch (e) {
      console.warn('[Challenge] Leaderboard fetch failed:', e);
      return challenge.participants.sort((a, b) => b.score - a.score);
    }
  },

  // ─── Leave Challenge ────────────────────────────────────────
  leaveChallenge: async (bookId: string): Promise<void> => {
    const challenge = getChallenges().find(c => c.bookId === bookId);
    if (challenge) {
      try {
        await clubMembersAPI.leaveGroup(challenge.id);
      } catch {}
      const challenges = getChallenges().filter(c => c.bookId !== bookId);
      saveChallenges(challenges);
    }
  },

  // ─── Store PIN↔Token mapping for joining ────────────────────
  storePinMapping: (pin: string, token: string) => {
    try {
      const mapStr = localStorage.getItem('sanctuary_pin_map');
      const map: Record<string, string> = mapStr ? JSON.parse(mapStr) : {};
      map[pin] = token;
      localStorage.setItem('sanctuary_pin_map', JSON.stringify(map));
    } catch {}
  },

  // ─── Get the PIN for sharing ────────────────────────────────
  getShareablePin: (bookId: string): string | null => {
    const challenge = getChallenges().find(c => c.bookId === bookId);
    return challenge?.inviteToken || challenge?.pin || null;
  },
};
