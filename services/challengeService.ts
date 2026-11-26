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

/** كتاب النادي «الحالي» (المختار عند الإنشاء) يُعدّ ضمن المنافسة ولو لم يُسجَّل في السجل بعد */
function withCurrentBook(
  books: ClubBookEntry[],
  club: { currentBookTitle?: string; currentBookAuthor?: string } | null | undefined
): ClubBookEntry[] {
  const title = (club?.currentBookTitle || '').trim();
  if (!title) return books;
  const key = makeBookKey(title);
  if (books.some(b => b.key === key)) return books;
  return [...books, { key, title, author: (club?.currentBookAuthor || '').trim() }];
}

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
  bookKey?: string,
  left?: boolean
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
    ...(left ? { left: true } : {}),
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

const _codeSynced = new Set<string>();
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
      const leftAt = new Map<string, number>();   // bookKey|uid → وقت الانسحاب
      for (const msg of res.data.messages) {
        const pr = isProgressMessage(msg.body || '');
        if (!pr || !pr.bookKey || !keys.includes(pr.bookKey)) continue;
        const uid = authorOf(msg);
        if (pr.left) {
          const lk = `${pr.bookKey}|${uid}`;
          leftAt.set(lk, Math.max(leftAt.get(lk) || 0, pr.timestamp));
          continue;
        }
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
      leftAt.forEach((t, lk) => {
        const [k, uid] = lk.split('|');
        const m = latest.get(k);
        const cur = m?.get(uid);
        if (m && cur && cur.lastUpdated <= t) m.delete(uid);
      });
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

      // يقبل الرمز وحده أو رابط الدعوة كاملاً
      const parsed = clubInviteCode.parse(pin);
      if (!parsed) {
        return { success: false, error: 'رمز المنافسة غير صالح — الصق الرمز كاملاً أو رابط الدعوة' };
      }
      pin = parsed;

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
        const registry = withCurrentBook(await fetchClubBooks(group._id), group);
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
    }

    // 2) سحابياً — مع تجنب تكرار نفس الحالة (إلا نبضة كل 5 دقائق ليبقى أثرك داخل نافذة الرسائل)
    const sig = `${currentPage}|${totalPages}|${readingMinutes}|${stars}|${identity.name}|${identity.country}`;
    const last = _lastSent.get(bookId);
    if (last && last.sig === sig && Date.now() - last.at < HEARTBEAT_MS) return;

    try {
      const res: any = await clubMessagesAPI.send(challenge.id, {
        body: buildProgressPayload(identity, currentPage, totalPages, readingMinutes, stars, challenge.clubId ? challenge.bookKey : undefined),
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

      const seriesByUser = new Map<string, ChallengePoint[]>();
      const leftAt = new Map<string, number>();

      for (const msg of messagesResult.data.messages) {
        const progress = isProgressMessage(msg.body || '');
        if (!progress) continue;
        // داخل نادي: لكل كتاب منافسته الخاصة
        if (challenge.clubId && progress.bookKey !== challenge.bookKey) continue;

        const authorId = typeof msg.authorId === 'object' ? msg.authorId._id : msg.authorId;
        // انسحاب: لا يدخل في المنحنى ولا اللوحة (ما لم تأتِ بعده رسالة تقدّم أحدث)
        if (progress.left) {
          leftAt.set(authorId, Math.max(leftAt.get(authorId) || 0, progress.timestamp));
          continue;
        }
        // كل رسالة تقدّم = نقطة على منحنى صاحبها
        const pts = seriesByUser.get(authorId) || [];
        pts.push({
          t: progress.timestamp,
          m: progress.readingMinutes,
          p: progress.percentComplete,
          s: progress.stars,
          sc: progress.readingMinutes + progress.percentComplete,
        });
        seriesByUser.set(authorId, pts);

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

      // من انسحب ولم يعد بعد ذلك يُحذف من اللوحة
      leftAt.forEach((t, uid) => {
        const cur = latestByUser.get(uid);
        if (cur && cur.lastUpdated <= t) latestByUser.delete(uid);
      });

      // دمج السجل السحابي مع المحلي (النافذة 200 رسالة قد لا تحمل كل التاريخ)
      const withHistory = Array.from(latestByUser.values()).map(p => ({
        ...p,
        history: mergeHistory(p.history || [], seriesByUser.get(p.userId) || []),
      }));
      const participants = sortParticipants(withHistory);

      // توحيد رمز المنافسة مع رمز النادي (غير حاجب)
      challengeService.syncCanonicalCode(bookId);

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
      // منافسة داخل نادي: نخرج من منافسة هذا الكتاب فقط ونبقى عضواً في النادي
      if (challenge.clubId) {
        const identity = getIdentity();
        if (identity && challenge.bookKey) {
          try {
            await Promise.race([
              clubMessagesAPI.send(challenge.id, {
                body: buildProgressPayload(identity, 0, 0, 0, 0, challenge.bookKey, true),
                type: 'thought',
              }),
              new Promise((resolve) => setTimeout(resolve, 6000)),
            ]);
          } catch {}
        }
      } else {
        try {
          await clubMembersAPI.leaveGroup(challenge.id);
        } catch {}
      }
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

  // ═══════════════════════════════════════════════════════════
  //  المنافسات داخل الأندية
  // ═══════════════════════════════════════════════════════════
  /** أنديتي الحقيقية (بلا مجموعات المنافسات المستقلة) */
  getMyClubs: async (): Promise<{ club: ReadingClub; canManage: boolean }[]> => {
    try {
      const res: any = await clubGroupsAPI.getMyGroups();
      const list: ReadingClub[] = res?.ok && Array.isArray(res.data) ? res.data : [];
      const me = readingClubAuth.getLocalProfile()?.id || '';
      return list
        .filter(c => c.status !== 'deleted' && c.status !== 'archived' && c.privacy !== 'personal' && !isChallengeGroup(c))
        .map(c => ({ club: c, canManage: ADMIN_ROLES.includes(c.myRole || '') || c.ownerId === me }));
    } catch { return []; }
  },

  /** يوحّد رمز المنافسة مع رمز دعوة النادي نفسه (مرة لكل نادٍ في الجلسة) */
  syncCanonicalCode: async (bookId: string): Promise<void> => {
    const challenge = getChallenges().find(c => c.bookId === bookId);
    if (!challenge || _codeSynced.has(challenge.id)) return;
    _codeSynced.add(challenge.id);
    try {
      const res: any = await clubGroupsAPI.getGroup(challenge.id);
      const code: string | undefined = res?.ok ? (res.data?.group?.inviteCode || res.data?.inviteCode) : undefined;
      if (!code) return;
      clubInviteCode.set(challenge.id, code);
      const all = getChallenges();
      let changed = false;
      all.forEach(c => {
        if (c.id === challenge.id && c.inviteToken !== code) { c.inviteToken = code; c.pin = generatePinFromToken(code); changed = true; }
      });
      if (changed) saveChallenges(all);
    } catch {}
  },

  /** تنظيف الأثر المحلي لنادٍ حُذف */
  forgetClub: (clubId: string): void => {
    saveChallenges(getChallenges().filter(c => c.id !== clubId));
    try {
      localStorage.removeItem(`sanctuary_club_books_${clubId}`);
      localStorage.removeItem(`sanctuary_club_invite_${clubId}`);
    } catch {}
  },

  getClubBooks: async (clubId: string, club?: { currentBookTitle?: string; currentBookAuthor?: string } | null) =>
    withCurrentBook(await fetchClubBooks(clubId), club),
  /** هل أنا مشارك في منافسة هذا الكتاب داخل هذا النادي؟ (يعيد معرّف الكتاب المحلي) */
  getMyClubParticipation: (clubId: string): { bookKey: string; bookId: string }[] =>
    getChallenges().filter(c => c.clubId === clubId && c.bookKey).map(c => ({ bookKey: c.bookKey!, bookId: c.bookId })),
  /** يسجّل كتاب النادي الحالي في السجل (للمشرفين) إن لم يكن مسجَّلاً */
  registerCurrentBook: async (clubId: string, club: { currentBookTitle?: string; currentBookAuthor?: string }) => {
    if (!club.currentBookTitle) return;
    const books = await fetchClubBooks(clubId);
    if (books.some(b => b.key === makeBookKey(club.currentBookTitle!))) return;
    await challengeService.addClubBook(clubId, club.currentBookTitle, club.currentBookAuthor || '');
  },
  getCachedClubBooks: (clubId: string, club?: { currentBookTitle?: string; currentBookAuthor?: string } | null): ClubBookEntry[] =>
    withCurrentBook(readBooksCache(clubId).books, club),
  fetchClubBoards: (clubId: string, keys: string[]) => fetchClubBoards(clubId, keys),

  addClubBook: async (clubId: string, title: string, author: string): Promise<ClubBookEntry[]> => {
    const books = await fetchClubBooks(clubId);
    const key = makeBookKey(title);
    if (!title.trim() || books.some(b => b.key === key)) return books;
    const next = [...books, { key, title: title.trim(), author: (author || '').trim() }];
    await postBooksSnapshot(clubId, next);
    return next;
  },

  removeClubBook: async (clubId: string, key: string): Promise<ClubBookEntry[]> => {
    const books = await fetchClubBooks(clubId);
    const next = books.filter(b => b.key !== key);
    await postBooksSnapshot(clubId, next);
    return next;
  },

  /** المنافسات في أنديتي التي تطابق كتابي (للانضمام بلا رمز) */
  getClubCompetitionsForBook: async (bookTitle: string) => {
    const clubs = (await challengeService.getMyClubs()).slice(0, 10);
    const lists = await Promise.all(clubs.map(async c => ({ ...c, books: withCurrentBook(await fetchClubBooks(c.club._id), c.club) })));
    const out: { club: ReadingClub; canManage: boolean; entry: ClubBookEntry }[] = [];
    for (const c of lists) {
      const hit = c.books.find(b => titleMatches(b.title, bookTitle));
      if (hit) out.push({ club: c.club, canManage: c.canManage, entry: hit });
    }
    return { clubs: lists, matches: out };
  },

  /** إنشاء منافسة لكتابي داخل نادٍ أديره (يُسجَّل الكتاب في سجل النادي) */
  createChallengeInClub: (
    identity: ChallengeIdentity,
    club: ReadingClub,
    bookId: string,
    bookTitle: string,
    bookAuthor: string
  ): Promise<{ success: boolean; challenge?: BookChallenge; code?: string; error?: string }> =>
   once(`createclub:${bookId}`, async () => {
    try {
      if (!readingClubAuth.isLoggedIn()) {
        const reg = await readingClubAuth.register(identity.name, 0);
        if (!reg.success) return { success: false, error: reg.error || 'Registration failed' };
      }
      readingClubAuth.updateProfile({ nickname: identity.name }).catch(() => {});

      const token = await clubInviteCode.ensure(club._id, club);
      if (!token) return { success: false, error: 'Failed to read club invite code' };

      const books = await challengeService.addClubBook(club._id, bookTitle, bookAuthor);
      const entry = books.find(b => b.key === makeBookKey(bookTitle));
      if (!entry) return { success: false, error: 'Failed to register book in club' };

      saveIdentity(identity);
      const challenge = buildClubChallenge(club, entry, identity, bookId, bookTitle, bookAuthor, token, true);
      saveChallenges([...getChallenges().filter(c => c.bookId !== bookId), challenge]);

      Promise.resolve(clubMessagesAPI.send(club._id, {
        body: buildProgressPayload(identity, 0, 0, 0, 0, entry.key),
        type: 'announcement',
      })).catch(() => {});
      return { success: true, challenge, code: token };
    } catch (e: any) {
      return { success: false, error: e.message || 'Unknown error' };
    }
   }),

  /** المشاركة في كتاب مسجَّل في نادٍ أنا عضو فيه (بلا رمز) */
  joinClubBook: (
    identity: ChallengeIdentity,
    club: { _id: string; name: string; inviteCode?: string },
    entry: ClubBookEntry,
    bookId: string,
    bookTitle: string,
    bookAuthor: string,
    isManager = false
  ): Promise<{ success: boolean; challenge?: BookChallenge; error?: string }> =>
   once(`joinclub:${bookId}`, async () => {
    try {
      if (!readingClubAuth.isLoggedIn()) {
        const reg = await readingClubAuth.register(identity.name, 0);
        if (!reg.success) return { success: false, error: reg.error || 'Registration failed' };
      }
      readingClubAuth.updateProfile({ nickname: identity.name }).catch(() => {});
      saveIdentity(identity);
      const token = clubInviteCode.get(club._id, club) || '';
      const challenge = buildClubChallenge(club, entry, identity, bookId, bookTitle, bookAuthor, token, isManager);
      saveChallenges([...getChallenges().filter(c => c.bookId !== bookId), challenge]);
      Promise.resolve(clubMessagesAPI.send(club._id, {
        body: buildProgressPayload(identity, 0, 0, 0, 0, entry.key),
        type: 'announcement',
      })).catch(() => {});
      return { success: true, challenge };
    } catch (e: any) {
      return { success: false, error: e.message || 'Unknown error' };
    }
   }),

  // ─── Get the PIN for sharing ────────────────────────────────
  getShareablePin: (bookId: string): string | null => {
    const challenge = getChallenges().find(c => c.bookId === bookId);
    return challenge?.inviteToken || challenge?.pin || null;
  },
};
