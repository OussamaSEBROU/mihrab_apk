// ══════════════════════════════════════════════════════════════
// BADGE STORE — مصدر حالة ثابت ومستقر لأوسمة المخطوطات
// ──────────────────────────────────────────────────────────────
// المشكلة: كان الوسام يُقرأ من الحقل book.stars فقط، وهذا الحقل قد
// يُستبدل بنسخة قديمة (stale) عند أي حفظ يعتمد على حالة React قديمة
// أو استعادة من نسخة احتياطية أو مزامنة، فيبدو الوسام وكأنه اختفى
// ثم عاد مع أول تحديث لاحق.
//
// الحل: الوسام المعروض = أعلى قيمة بين ثلاثة مصادر مستقلة:
//   1) الحقل المخزَّن book.stars
//   2) القيمة المحسوبة من الزمن المتراكم book.timeSpentSeconds
//   3) "أعلى علامة مائية" مخزنة منفصلة لكل كتاب (High-Water Mark)
// والقيمة لا تنخفض أبداً إلا بحذف الكتاب نفسه.
// ══════════════════════════════════════════════════════════════

import type { Book } from '../types';

const HWM_KEY = 'sanctuary_badges_hwm_v1';

/** عتبات الأوسمة بالثواني — مطابقة تماماً لما في storageService / Dashboard */
export const BADGE_THRESHOLDS_SECONDS = [900, 1800, 3000, 8400, 12000, 15600, 19200];

export const badgesFromSeconds = (seconds: number): number => {
  let n = 0;
  for (const th of BADGE_THRESHOLDS_SECONDS) {
    if ((seconds || 0) >= th) n++;
    else break;
  }
  return n;
};

let _hwm: Record<string, number> | null = null;

const load = (): Record<string, number> => {
  if (_hwm) return _hwm;
  try {
    const raw = localStorage.getItem(HWM_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    _hwm = parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    _hwm = {};
  }
  return _hwm!;
};

let _persistTimer: any = null;
const persistSoon = () => {
  if (_persistTimer) return;
  _persistTimer = setTimeout(() => {
    _persistTimer = null;
    try { localStorage.setItem(HWM_KEY, JSON.stringify(load())); } catch { /* non-critical */ }
  }, 300);
};

export const badgeStore = {
  /** عدد الأوسمة المستحقة فعلياً للكتاب — مستقر ولا يتراجع */
  getEarned: (book: Pick<Book, 'id' | 'stars' | 'timeSpentSeconds'>): number => {
    const stored = book.stars || 0;
    const derived = badgesFromSeconds(book.timeSpentSeconds || 0);
    const mark = load()[book.id] || 0;
    const earned = Math.max(stored, derived, mark);
    // رفع العلامة المائية فقط (لا تنخفض)
    if (earned > mark) {
      load()[book.id] = earned;
      persistSoon();
    }
    return earned;
  },

  /** تسجيل صريح (يُستدعى بعد الوصول لنجمة جديدة) */
  record: (bookId: string, count: number) => {
    if (count > (load()[bookId] || 0)) {
      load()[bookId] = count;
      persistSoon();
    }
  },

  /** حذف أثر كتاب محذوف فقط */
  forget: (bookId: string) => {
    if (load()[bookId] !== undefined) {
      delete load()[bookId];
      persistSoon();
    }
  },

  /** مسح شامل (يُستدعى فقط عند "المسح الشامل" الصريح من المستخدم) */
  clearAll: () => {
    _hwm = {};
    try { localStorage.removeItem(HWM_KEY); } catch { /* non-critical */ }
  },

  /** يعيد نسخة من الكتاب بحقل stars مرفوع للقيمة المستقرة (أو نفس الكائن إن لم يتغير) */
  stabilize: <T extends Book>(book: T): T => {
    const earned = badgeStore.getEarned(book);
    return earned === (book.stars || 0) ? book : { ...book, stars: earned };
  }
};
