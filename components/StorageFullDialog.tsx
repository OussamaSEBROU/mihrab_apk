// نافذة عامة: «مساحة التخزين ممتلئة» — تظهر فوق كل شيء، تُوقف العملية، وتتيح المتابعة بعد التفريغ.
import React, { useEffect, useState } from 'react';
import { HardDrive } from 'lucide-react';
import { STORAGE_FULL_EVENT, StorageFullDetail, getFreeBytes } from '../services/storageGuard';

const fmt = (n?: number | null) => {
  if (n == null || !isFinite(n)) return '';
  if (n >= 1024 ** 3) return (n / 1024 ** 3).toFixed(2) + ' GB';
  return Math.max(0, Math.round(n / 1024 / 1024)) + ' MB';
};

const StorageFullDialog: React.FC<{ lang: 'ar' | 'en' }> = ({ lang }) => {
  const isRTL = lang === 'ar';
  const [detail, setDetail] = useState<StorageFullDetail | null>(null);
  const [free, setFree] = useState<number | null>(null);

  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent<StorageFullDetail>).detail || { context: '' };
      setDetail(d);
      setFree(d.freeBytes ?? null);
      if (d.freeBytes == null) getFreeBytes().then(setFree).catch(() => {});
    };
    window.addEventListener(STORAGE_FULL_EVENT, h);
    return () => window.removeEventListener(STORAGE_FULL_EVENT, h);
  }, []);

  if (!detail) return null;

  const close = () => setDetail(null);
  const retry = () => { const r = detail.retry; setDetail(null); if (r) setTimeout(r, 50); };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-5"
      style={{ zIndex: 10050, background: 'rgba(0,0,0,0.82)' }}
      dir={isRTL ? 'rtl' : 'ltr'}
      role="alertdialog"
      aria-modal="true"
    >
      <div style={{ width: '100%', maxWidth: 380, background: '#0b0b0b', border: '1px solid rgba(220,38,38,0.35)', borderRadius: 24, padding: 22, textAlign: 'center' }}>
        <div style={{ width: 54, height: 54, margin: '0 auto 12px', borderRadius: 18, background: 'rgba(220,38,38,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <HardDrive size={26} color="#ef4444" />
        </div>
        <h3 style={{ color: '#fff', fontWeight: 900, fontSize: 17, margin: '0 0 8px' }}>
          {isRTL ? 'مساحة التخزين ممتلئة' : 'Storage is full'}
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 1.8, margin: 0 }}>
          {isRTL
            ? 'لا توجد مساحة كافية في هاتفك لإتمام هذه العملية، وقد أوقفها التطبيق حفاظاً على بياناتك. أفرغ بعض المساحة (احذف ملفات أو صوراً أو تطبيقات غير مستخدمة) ثم اضغط «إعادة المحاولة». يمكنك في الأثناء مواصلة القراءة والتعديل.'
            : 'There is not enough space on your phone to finish this. The app stopped the operation to protect your data. Free some space (delete files, photos or unused apps), then tap Retry. You can keep reading and editing meanwhile.'}
        </p>
        {(free != null || detail.neededBytes) && (
          <p style={{ color: 'rgba(251,191,36,0.85)', fontSize: 12, fontWeight: 800, margin: '10px 0 0' }} dir="ltr">
            {free != null ? `${isRTL ? 'المتاح' : 'Free'}: ${fmt(free)}` : ''}
            {free != null && detail.neededBytes ? '  ·  ' : ''}
            {detail.neededBytes ? `${isRTL ? 'المطلوب' : 'Needed'}: ≈ ${fmt(detail.neededBytes)}` : ''}
          </p>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button onClick={close} style={{ flex: 1, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.07)', color: '#fff', fontWeight: 800, fontSize: 13, border: '1px solid rgba(255,255,255,0.1)' }}>
            {isRTL ? 'إغلاق' : 'Close'}
          </button>
          <button onClick={retry} style={{ flex: 1, height: 44, borderRadius: 14, background: '#dc2626', color: '#fff', fontWeight: 900, fontSize: 13, border: 'none' }}>
            {isRTL ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StorageFullDialog;
