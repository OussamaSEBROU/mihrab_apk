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
// ذاكرة وسيطة: كان getChallenges() يعمل JSON.parse جديداً في كل استدعاء (وفي كل render للقارئ)
// فيُنتج كائنات جديدة كل مرة ويُسبّب إعادة جلب لا نهائية للوحة الصدارة + ثقلاً في القارئ.
let _challengesCache: BookChallenge[] | null = null;

function getChallenges(): BookChallenge[] {
  if (_challengesCache) return _challengesCache;
  try {
    const data = localStorage.getItem(CHALLENGES_KEY);
    const parsed = data ? JSON.parse(data) : [];
    _challengesCache = Array.isArray(parsed) ? parsed : [];
  } catch { _challengesCache = []; }
  return _challengesCache!;
}

function saveChallenges(challenges: BookChallenge[]) {
  _challengesCache = challenges;
  try { localStorage.setItem(CHALLENGES_KEY, JSON.stringify(challenges)); } catch { /* non-critical */ }
}

// منع التنفيذ المزدوج (ضغطتان متتاليتان = مجموعتان على السيرفر) + منع تكرار الجلب المتزامن
const _inflight = new Map<string, Promise<any>>();
function once<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const existing = _inflight.get(key);
  if (existing) return existing as Promise<T>;
  const p = factory().finally(() => { _inflight.delete(key); });
  _inflight.set(key, p);
  return p;
}

// آخر حالة أُرسلت للسحابة لكل كتاب (لتجنب رسائل مكررة تملأ نافذة الـ 200 رسالة)
const _lastSent = new Map<string, { sig: string; at: number }>();
const HEARTBEAT_MS = 5 * 60 * 1000;

const sortParticipants = (list: ChallengeParticipant[]) =>
  [...list].sort((a, b) =>
    (b.score - a.score) ||
    (b.percentComplete - a.percentComplete) ||
    (a.lastUpdated - b.lastUpdated) ||
    a.userId.localeCompare(b.userId));

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
  createChallenge: (
    identity: ChallengeIdentity,
    bookId: string,
    bookTitle: string,
    bookAuthor: string
  ): Promise<{ success: boolean; challenge?: BookChallenge; pin?: string; error?: string }> =>
   once(`create:${bookId}`, async () => {
    try {
      // Ensure user is registered with Reading Club system
      if (!readingClubAuth.isLoggedIn()) {
        const regResult = await readingClubAuth.register(identity.name, 0);
        if (!regResult.success) {
          return { success: false, error: regResult.error || 'Registration failed' };
        }
      }

      // Update profile nickname to match challenge identity (غير حاجب: لا يؤخر إنشاء المنافسة)
      readingClubAuth.updateProfile({ nickname: identity.name }).catch(() => {});

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

      // Send initial progress message (غير حاجب — يظهر المنافس فوراً محلياً والسحابة تلحق)
      Promise.resolve(clubMessagesAPI.send(group._id, {
        body: buildProgressPayload(identity, 0, 0, 0, 0),
        type: 'announcement',
      })).catch(() => {});

      return { success: true, challenge, pin };
    } catch (e: any) {
      return { success: false, error: e.message || 'Unknown error' };
    }
   }),

  // ─── Join Challenge ─────────────────────────────────────────
  joinChallenge: (
    identity: ChallengeIdentity,
    pin: string,
    bookId: string
  ): Promise<{ success: boolean; challenge?: BookChallenge; error?: string }> =>
   once(`join:${bookId}`, async () => {
    try {
      // Ensure user is registered
      if (!readingClubAuth.isLoggedIn()) {
        const regResult = await readingClubAuth.register(identity.name, 0);
        if (!regResult.success) {
          return { success: false, error: regResult.error || 'Registration failed' };
        }
      }

      readingClubAuth.updateProfile({ nickname: identity.name }).catch(() => {});

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

      // لا نمنع الانضمام أبداً عند اختلاف معرّف الكتاب: المعرّف مشتق من بصمة ملف PDF، فتختلف
      // قيمته بين نسختين (طبعة/ضغط/تصدير مختلف) أو مع كتب قديمة، رغم أنه الكتاب نفسه.
      // الكتاب الذي فتح المستخدم نافذة المنافسة منه هو المرجع، والتقدّم يُربط بمعرّف المجموعة لا بمعرّف الكتاب.
      if (group.currentBookId && group.currentBookId !== bookId) {
        console.warn('[Challenge] Book id differs from creator\'s; joining anyway', group.currentBookId, bookId);
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
        // نبذر المشارك الحالي محلياً: تظهر لوحة الصدارة فوراً بدل شاشة "لا يوجد متنافسون"
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
        isOwner: false,
        inviteToken,
        lastSyncedAt: Date.now(),
      };

      const challenges = getChallenges();
      const filtered = challenges.filter(c => c.bookId !== bookId);
      filtered.push(challenge);
      saveChallenges(filtered);

      // Send join progress message (غير حاجب)
      Promise.resolve(clubMessagesAPI.send(group._id, {
        body: buildProgressPayload(identity, 0, 0, 0, 0),
        type: 'announcement',
      })).catch(() => {});

      return { success: true, challenge };
    } catch (e: any) {
      return { success: false, error: e.message || 'Unknown error' };
    }
   }),

  // ─── Sync Progress ──────────────────────────────────────────
  // المحلي أولاً (فوري ومتسق دائماً) ثم السحابة بأفضل جهد — فلا تفشل اللوحة المحلية بسبب الشبكة.
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

    const userId = readingClubAuth.getLocalProfile()?.id || '';
    const percentComplete = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;
    const score = readingMinutes + percentComplete;

    // 1) تحديث محلي فوري
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
      const list = challenges[idx].participants;
      const existing = list.findIndex(p => p.userId === userId);
      if (existing !== -1) list[existing] = myParticipant;
      else list.push(myParticipant);
      challenges[idx].lastSyncedAt = Date.now();
      saveChallenges(challenges);
    }

    // 2) سحابياً — مع تجنب تكرار نفس الحالة (إلا نبضة كل 5 دقائق ليبقى أثرك داخل نافذة الرسائل)
    const sig = `${currentPage}|${totalPages}|${readingMinutes}|${stars}|${identity.name}|${identity.country}`;
    const last = _lastSent.get(bookId);
    if (last && last.sig === sig && Date.now() - last.at < HEARTBEAT_MS) return;

    try {
      const res: any = await clubMessagesAPI.send(challenge.id, {
        body: buildProgressPayload(identity, currentPage, totalPages, readingMinutes, stars),
        type: 'thought',
      });
      if (!res || res.ok !== false) _lastSent.set(bookId, { sig, at: Date.now() });
    } catch (e) {
      console.warn('[Challenge] Progress sync failed:', e);
    }
  },

  // ─── Fetch Leaderboard ──────────────────────────────────────
  // يعيد دائماً قائمة غير فارغة قدر الإمكان: يدمج السحابة مع الذاكرة المحلية (أحدث وقت يفوز)
  // بحيث لا يختفي متنافس لمجرد أن رسالته خرجت من نافذة آخر 200 رسالة.
  getCachedLeaderboard: (bookId: string): ChallengeParticipant[] => {
    const challenge = getChallenges().find(c => c.bookId === bookId);
    return challenge ? sortParticipants(challenge.participants || []) : [];
  },

  fetchLeaderboard: (bookId: string): Promise<ChallengeParticipant[]> =>
   once(`board:${bookId}`, async () => {
    const challenge = getChallenges().find(c => c.bookId === bookId);
    if (!challenge) return [];
    const cached = () => sortParticipants(challenge.participants || []);

    try {
      // مهلة قصوى: لا ننتظر سيرفراً نائماً أكثر من 12 ثانية والواجهة تعرض المخزَّن
      const messagesResult: any = await Promise.race([
        clubMessagesAPI.list(challenge.id, undefined, 200),
        new Promise((resolve) => setTimeout(() => resolve(null), 12000)),
      ]);
      if (!messagesResult || !messagesResult.ok || !messagesResult.data?.messages) {
        return cached();
      }

      // Parse progress messages — keep only latest per user
      const latestByUser = new Map<string, ChallengeParticipant>();

      // ابدأ من النسخة المحلية ثم دع السحابة تتفوق عند كونها أحدث
      for (const p of challenge.participants || []) latestByUser.set(p.userId, p);

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

      const participants = sortParticipants(Array.from(latestByUser.values()));

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
      return cached();
    }
   }),

  // ─── Leave Challenge ────────────────────────────────────────
  leaveChallenge: async (bookId: string): Promise<void> => {
    const challenge = getChallenges().find(c => c.bookId === bookId);
    if (challenge) {
      try {
        await clubMembersAPI.leaveGroup(challenge.id);
      } catch {}
      const challenges = getChallenges().filter(c => c.bookId !== bookId);
      saveChallenges(challenges);
      _lastSent.delete(bookId);
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
