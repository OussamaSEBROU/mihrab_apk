// ══════════════════════════════════════════════════════════════
// CHALLENGE SERVICE — PIN-based Book Competition Engine
// Uses existing Reading Club API (groups + messages) as backend
// ══════════════════════════════════════════════════════════════

import { readingClubAuth } from './readingClubAuth';
import { clubGroupsAPI, clubInvitesAPI, clubMembersAPI, clubMessagesAPI } from './readingClubAPI';
import { readingClubSync } from './readingClubSync';
import { clubInviteCode } from './clubInviteCode';
import type { ReadingClub } from '../types/readingClub';
import type {
  ClubBookEntry, ClubBooksSnapshotMessage,
  ChallengePoint,
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

// ── سجل التقدّم: دمج بالاتحاد (حسب الوقت) مع تخفيف ذكي للحفاظ على الشكل العام ──
const MAX_HISTORY = 160;
const mergeHistory = (a: ChallengePoint[] = [], b: ChallengePoint[] = []): ChallengePoint[] => {
  const byT = new Map<number, ChallengePoint>();
  for (const pt of a) byT.set(pt.t, pt);
  for (const pt of b) byT.set(pt.t, pt);
  const all = Array.from(byT.values()).sort((x, y) => x.t - y.t);
  if (all.length <= MAX_HISTORY) return all;
  const step = (all.length - 1) / (MAX_HISTORY - 1);
  const out: ChallengePoint[] = [];
  for (let i = 0; i < MAX_HISTORY; i++) out.push(all[Math.round(i * step)]);
  return out;
};

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

// ── منافسات داخل الأندية: مفتاح الكتاب يُشتق من العنوان (لا من معرّف الملف) ليتطابق بين الأجهزة ──
const normalizeTitle = (t: string) =>
  (t || '')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')   // التشكيل والتطويل
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}]+/gu, '');

export const makeBookKey = (title: string): string => {
  const n = normalizeTitle(title);
  let h = 5381;
  for (let i = 0; i < n.length; i++) h = ((h * 33) ^ n.charCodeAt(i)) >>> 0;
  return `bk_${h.toString(16)}`;
};

export const titleMatches = (a: string, b: string): boolean => {
  const x = normalizeTitle(a), y = normalizeTitle(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.length >= 4 && long.includes(short);
};

const isChallengeGroup = (g: { description?: string } | null | undefined) =>
  !!g && (g.description || '').startsWith('منافسة كتاب:');

function parseBooksSnapshot(body: string): ClubBooksSnapshotMessage | null {
  if (!body || body.charCodeAt(0) !== 123) return null;
  try {
    const parsed = JSON.parse(body);
    if (parsed && parsed._isClubBooks && Array.isArray(parsed.books)) return parsed;
  } catch {}
  return null;
}

function buildProgressPayload(
  identity: ChallengeIdentity,
  currentPage: number,
  totalPages: number,
  readingMinutes: number,
  stars: number,
  bookKey?: string
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
    timestamp: Date.now(),
    ...(bookKey ? { bookKey } : {}),
  };
  return JSON.stringify(msg);
}

// ══════════════════════════════════════════════════════════════
// CLUB BOOKS REGISTRY — سجل كتب المنافسة داخل النادي
// لا يملك السيرفر حقلاً لعدة كتب، فيُحفظ السجل كلقطة نظام (_isClubBooks) داخل رسائل المجموعة.
// تُقبل اللقطات من المالك/المشرفين فقط، ويُحفظ نسخة محلية، ويُعاد نشرها عند تقادمها
// حتى لا تخرج من نافذة آخر 200 رسالة.
// ══════════════════════════════════════════════════════════════
const BOOKS_KEY = (id: string) => `sanctuary_club_books_${id}`;
const REANNOUNCE_MS = 24 * 60 * 60 * 1000;
const ADMIN_ROLES = ['owner', 'full_admin', 'content_admin', 'member_admin', 'admin'];

function readBooksCache(clubId: string): { books: ClubBookEntry[]; at: number } {
  try {
    const raw = localStorage.getItem(BOOKS_KEY(clubId));
    const v = raw ? JSON.parse(raw) : null;
    if (v && Array.isArray(v.books)) return { books: v.books, at: Number(v.at) || 0 };
  } catch {}
  return { books: [], at: 0 };
}
function writeBooksCache(clubId: string, books: ClubBookEntry[], at: number) {
  try { localStorage.setItem(BOOKS_KEY(clubId), JSON.stringify({ books, at })); } catch {}
}

const _adminCache = new Map<string, { ids: Set<string> | null; at: number }>();
async function getAdminIds(clubId: string): Promise<Set<string> | null> {
  const hit = _adminCache.get(clubId);
  if (hit && Date.now() - hit.at < 60000) return hit.ids;
  let ids: Set<string> | null = null;
  try {
    const res: any = await clubMembersAPI.list(clubId);
    if (res?.ok && Array.isArray(res.data)) {
      ids = new Set<string>();
      for (const m of res.data) {
        if (m.status && m.status !== 'active' && m.status !== 'muted') continue;
        if (!ADMIN_ROLES.includes(m.role)) continue;
        const uid = m.userId && typeof m.userId === 'object' ? m.userId._id : m.userId;
        if (uid) ids.add(uid);
      }
    }
  } catch {}
  _adminCache.set(clubId, { ids, at: Date.now() });
  return ids;
}

const authorOf = (msg: any): string => (msg?.authorId && typeof msg.authorId === 'object' ? msg.authorId._id : msg?.authorId) || '';

async function postBooksSnapshot(clubId: string, books: ClubBookEntry[]) {
  const snap: ClubBooksSnapshotMessage = { _isClubBooks: true, books, timestamp: Date.now() };
  writeBooksCache(clubId, books, snap.timestamp);
  try {
    await clubMessagesAPI.send(clubId, { body: JSON.stringify(snap), type: 'announcement' });
  } catch (e) { console.warn('[Challenge] Books snapshot failed:', e); }
}

function fetchClubBooks(clubId: string): Promise<ClubBookEntry[]> {
  return once(`books:${clubId}`, async () => {
    const cache = readBooksCache(clubId);
    try {
      const res: any = await Promise.race([
        clubMessagesAPI.list(clubId, undefined, 200),
        new Promise((resolve) => setTimeout(() => resolve(null), 10000)),
      ]);
      if (!res || !res.ok || !res.data?.messages) return cache.books;
      const admins = await getAdminIds(clubId);
      let best: ClubBooksSnapshotMessage | null = null;
      for (const msg of res.data.messages) {
        const snap = parseBooksSnapshot(msg.body || '');
        if (!snap) continue;
        if (admins && !admins.has(authorOf(msg))) continue;
        if (!best || snap.timestamp > best.timestamp) best = snap;
      }
      const myId = readingClubAuth.getLocalProfile()?.id || '';
      const iAmAdmin = !!admins && admins.has(myId);
      if (best && best.timestamp >= cache.at) {
        writeBooksCache(clubId, best.books, best.timestamp);
        if (iAmAdmin && Date.now() - best.timestamp > REANNOUNCE_MS) postBooksSnapshot(clubId, best.books);
        return best.books;
      }
      if (!best && cache.books.length && iAmAdmin) postBooksSnapshot(clubId, cache.books);
      return cache.books;
    } catch {
      return cache.books;
    }
  });
}

/** تجميع تقدّم كل كتاب داخل النادي */
function fetchClubBoards(clubId: string, keys: string[]): Promise<Record<string, ChallengeParticipant[]>> {
  return once(`clubboards:${clubId}`, async () => {
    const out: Record<string, ChallengeParticipant[]> = {};
    keys.forEach(k => { out[k] = []; });
    try {
      const res: any = await Promise.race([
        clubMessagesAPI.list(clubId, undefined, 200),
        new Promise((resolve) => setTimeout(() => resolve(null), 12000)),
      ]);
      if (!res || !res.ok || !res.data?.messages) return out;
      const latest = new Map<string, Map<string, ChallengeParticipant>>();
      for (const msg of res.data.messages) {
        const pr = isProgressMessage(msg.body || '');
        if (!pr || !pr.bookKey || !keys.includes(pr.bookKey)) continue;
        const uid = authorOf(msg);
        const m = latest.get(pr.bookKey) || new Map<string, ChallengeParticipant>();
        const ex = m.get(uid);
        if (!ex || pr.timestamp > ex.lastUpdated) {
          m.set(uid, {
            userId: uid, name: pr.name, country: pr.country,
            currentPage: pr.currentPage, totalPages: pr.totalPages, percentComplete: pr.percentComplete,
            readingMinutes: pr.readingMinutes, stars: pr.stars, lastUpdated: pr.timestamp,
            score: pr.readingMinutes + pr.percentComplete,
          });
        }
        latest.set(pr.bookKey, m);
      }
      latest.forEach((m, k) => { out[k] = sortParticipants(Array.from(m.values())); });
    } catch {}
    return out;
  });
}

function buildClubChallenge(
  club: { _id: string; name: string },
  entry: ClubBookEntry,
  identity: ChallengeIdentity,
  bookId: string,
  bookTitle: string,
  bookAuthor: string,
  token: string,
  isOwner: boolean
): BookChallenge {
  return {
    id: club._id,
    pin: token ? generatePinFromToken(token) : '',
    bookId,
    bookTitle: bookTitle || entry.title,
    bookAuthor: bookAuthor || entry.author,
    creatorName: isOwner ? identity.name : '',
    creatorCountry: isOwner ? identity.country : '',
    createdAt: Date.now(),
    participants: [{
      userId: readingClubAuth.getLocalProfile()?.id || '',
      name: identity.name,
      country: identity.country,
      currentPage: 0, totalPages: 0, percentComplete: 0, readingMinutes: 0, stars: 0,
      lastUpdated: Date.now(), score: 0,
    }],
    isOwner,
    inviteToken: token || undefined,
    lastSyncedAt: Date.now(),
    clubId: club._id,
    clubName: club.name,
    bookKey: entry.key,
  };
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

  /** كل المنافسات المحلية (لوحة التحليل الذكي) */
  getAll: (): BookChallenge[] => getChallenges(),

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

      // رمز الدعوة الموحَّد لهذا النادي (نفس الرمز في رابط الدعوة وصفحة الأعضاء)
      const token = await clubInviteCode.ensure(group._id, group);
      if (!token) {
        return { success: false, error: 'Failed to generate challenge PIN' };
      }
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
    bookId: string,
    bookMeta?: { title?: string; author?: string }
  ): Promise<{
    success: boolean; challenge?: BookChallenge; error?: string;
    /** النادي يضم عدة كتب ولم يُحسم أيها كتابك: يختار المستخدم */
    pending?: { club: { _id: string; name: string; inviteCode: string }; books: ClubBookEntry[] };
  }> =>
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

      // مجموعة نادي حقيقي (لا مجموعة منافسة مستقلة): الكتاب يُحدَّد من سجل كتب النادي
      let clubBook: ClubBookEntry | null = null;
      if (!isChallengeGroup(group)) {
        const registry = await fetchClubBooks(group._id);
        if (!registry.length) {
          return { success: false, error: 'هذا النادي لا يملك منافسات بعد — اطلب من المشرف إضافة الكتاب من صفحة النادي.' };
        }
        clubBook =
          (bookMeta?.title ? registry.find(b => titleMatches(b.title, bookMeta.title!)) : undefined) ||
          (registry.length === 1 ? registry[0] : null);
        if (!clubBook) {
          return { success: false, pending: { club: { _id: group._id, name: group.name, inviteCode: inviteToken }, books: registry } };
        }
      }

      saveIdentity(identity);

      // Create local challenge record
      const challenge: BookChallenge = {
        id: group._id,
        pin,
        bookId,
        bookTitle: clubBook?.title || group.currentBookTitle || group.name || '',
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
        ...(clubBook ? { clubId: group._id, clubName: group.name, bookKey: clubBook.key } : {}),
      };
      if (clubBook) clubInviteCode.set(group._id, inviteToken);

      const challenges = getChallenges();
      const filtered = challenges.filter(c => c.bookId !== bookId);
      filtered.push(challenge);
      saveChallenges(filtered);

      // Send join progress message (غير حاجب)
      Promise.resolve(clubMessagesAPI.send(group._id, {
        body: buildProgressPayload(identity, 0, 0, 0, 0, clubBook?.key),
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
      // سجل المنحنى: نقطة جديدة فقط عند تغيّر القيم أو مرور 5 دقائق
      const prevHistory = existing !== -1 ? (list[existing].history || []) : [];
      const lastPt = prevHistory[prevHistory.length - 1];
      const changed = !lastPt || lastPt.m !== readingMinutes || lastPt.p !== percentComplete || lastPt.s !== stars;
      const newPt: ChallengePoint = { t: myParticipant.lastUpdated, m: readingMinutes, p: percentComplete, s: stars, sc: score };
      myParticipant.history = (changed || myParticipant.lastUpdated - (lastPt?.t || 0) > HEARTBEAT_MS)
        ? mergeHistory(prevHistory, [newPt])
        : prevHistory;
      if (existing !== -1) list[existing] = myParticipant;
      else list.push(myParticipant);
      challenges[idx].lastSyncedAt = Date.now();
      saveChallenges(challenges);
