// ══════════════════════════════════════════════════════════════
// STORAGE GUARD — معالجة امتلاء ذاكرة الهاتف دون انهيار
// يكشف أخطاء الحصة/القرص الممتلئ في أي مكان بالتطبيق، ويرسل حدثاً واحداً
// تعرضه نافذة StorageFullDialog، ويتيح فحصاً استباقياً للمساحة قبل الإضافة.
// ══════════════════════════════════════════════════════════════

import { Capacitor } from '@capacitor/core';

export const STORAGE_FULL_EVENT = 'mihrab:storage-full';

export interface StorageFullDetail {
  context: string;          // أين حدث (إضافة كتاب، حفظ…)
  freeBytes?: number | null;
  neededBytes?: number | null;
  retry?: () => void;       // يُستدعى عند ضغط «إعادة المحاولة»
}

/** هل الخطأ ناتج عن امتلاء التخزين؟ */
export const isQuotaError = (e: any): boolean => {
  if (!e) return false;
  const name = String(e.name || e.constructor?.name || '');
  const msg = String(e.message || e.errorMessage || e || '').toLowerCase();
  if (/quota/i.test(name)) return true;
  if (e.code === 22 || e.code === 1014) return true;       // DOMException QUOTA_EXCEEDED / Firefox
  return /quota|no space|enospc|disk full|storage full|not enough space|insufficient storage|disk is full|out of space|memory full|space left/.test(msg);
};

let _lastReport = 0;

/** يرسل تنبيه الامتلاء (مع كبح التكرار 30 ثانية) */
export const reportStorageFull = (detail: StorageFullDetail): void => {
  const now = Date.now();
  if (now - _lastReport < 30000) return;
  _lastReport = now;
  try { window.dispatchEvent(new CustomEvent<StorageFullDetail>(STORAGE_FULL_EVENT, { detail })); } catch { /* noop */ }
};

/** المساحة الحرة التقريبية بالبايت (null = غير معروفة) */
export const getFreeBytes = async (): Promise<number | null> => {
  const candidates: number[] = [];
  try {
    if (Capacitor.isNativePlatform()) {
      const { Device } = await import('@capacitor/device');
      const info: any = await Device.getInfo();
      if (typeof info?.realDiskFree === 'number' && info.realDiskFree > 0) candidates.push(info.realDiskFree);
    }
  } catch { /* noop */ }
  try {
    const est = await navigator.storage?.estimate?.();
    if (est && typeof est.quota === 'number' && typeof est.usage === 'number') {
      candidates.push(Math.max(0, est.quota - est.usage));
    }
  } catch { /* noop */ }
  return candidates.length ? Math.min(...candidates) : null;
};

const SAFETY_MARGIN = 15 * 1024 * 1024; // هامش أمان 15MB

/**
 * فحص استباقي: true إن كانت المساحة كافية (أو غير معروفة)،
 * وإلا يُظهر التنبيه ويعيد false ليتوقف المستدعي دون أي كتابة.
 */
export const ensureSpace = async (neededBytes: number, context: string, retry?: () => void): Promise<boolean> => {
  const free = await getFreeBytes();
  if (free !== null && free < neededBytes + SAFETY_MARGIN) {
    _lastReport = 0;
    reportStorageFull({ context, freeBytes: free, neededBytes: neededBytes + SAFETY_MARGIN, retry });
    return false;
  }
  return true;
};

/** localStorage.setItem آمن: يعيد false عند الامتلاء ويُبلغ بدل أن يرمي خطأً */
export const safeSetItem = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (isQuotaError(e)) {
      reportStorageFull({ context: 'save' });
    } else {
      console.warn('localStorage write failed:', key, e);
    }
    return false;
  }
};

let _installed = false;
/** مستمعون عامون: أي خطأ امتلاء غير معالج يتحول إلى تنبيه بدل انهيار */
export const installGlobalStorageGuard = (): void => {
  if (_installed || typeof window === 'undefined') return;
  _installed = true;
  window.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
    if (isQuotaError(ev.reason)) { ev.preventDefault(); reportStorageFull({ context: 'background' }); }
  });
  window.addEventListener('error', (ev: ErrorEvent) => {
    if (isQuotaError(ev.error || ev.message)) { ev.preventDefault(); reportStorageFull({ context: 'background' }); }
  });
};
