// ══════════════════════════════════════════════════════════════
// BOOK CHALLENGE TYPES — PIN-based competitive reading
// ══════════════════════════════════════════════════════════════

export interface ChallengeIdentity {
  name: string;
  country: string;
}

// نقطة في السجل الزمني لمتنافس (لرسم المنحنيات والتحليل الإحصائي)
export interface ChallengePoint {
  t: number;   // الوقت (ms)
  m: number;   // الدقائق
  p: number;   // نسبة الإنجاز %
  s: number;   // النجوم
  sc: number;  // النقاط (دقائق + إنجاز)
}

export interface ChallengeParticipant {
  userId: string;
  name: string;
  country: string;
  currentPage: number;
  totalPages: number;
  percentComplete: number;
  readingMinutes: number;
  stars: number;
  lastUpdated: number;
  // Computed score: combines reading time + progress
  score: number;
  // سجل التقدّم عبر الزمن (اختياري — متوافق مع البيانات القديمة)
  history?: ChallengePoint[];
}

export interface BookChallenge {
  id: string;                    // Group ID from server
  pin: string;                   // 6-digit PIN for sharing
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  creatorName: string;
  creatorCountry: string;
  createdAt: number;
  participants: ChallengeParticipant[];
  isOwner: boolean;
  inviteToken?: string;          // Full invite token for API
  lastSyncedAt: number;
  // ── منافسة داخل نادي (اختياري — المنافسات القديمة المستقلة لا تحمل هذه الحقول) ──
  clubId?: string;               // معرّف النادي (= id)
  clubName?: string;
  bookKey?: string;              // مفتاح الكتاب داخل النادي (من العنوان)
  acceptUnkeyed?: boolean;       // يقبل رسائل تقدّم قديمة بلا مفتاح كتاب (منافسة مستقلة رُقّيت لنادٍ)
}

// كتاب مسجَّل للمنافسة داخل نادي
export interface ClubBookEntry {
  key: string;
  title: string;
  author: string;
  hash?: string;   // بصمة محتوى ملف الكتاب (SHA-256) — تُعرِّف الكتاب مهما اختلف اسمه
}

// لقطة سجل كتب النادي (تُرسل كرسالة نظام داخل مجموعة النادي)
export interface ClubBooksSnapshotMessage {
  _isClubBooks: true;
  books: ClubBookEntry[];
  timestamp: number;
}

export interface ChallengeProgress {
  bookId: string;
  currentPage: number;
  totalPages: number;
  readingMinutes: number;
  stars: number;
  timestamp: number;
}

// Progress update message format (sent as group messages)
export interface ChallengeProgressMessage {
  _isChallengeProgress: true;
  name: string;
  country: string;
  currentPage: number;
  totalPages: number;
  percentComplete: number;
  readingMinutes: number;
  stars: number;
  timestamp: number;
  bookKey?: string;   // يُضاف فقط للمنافسات داخل الأندية
  left?: boolean;     // انسحاب صاحب الرسالة من منافسة هذا الكتاب
}
