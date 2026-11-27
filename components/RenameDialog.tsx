// نافذة تعديل اسم (كتاب أو رف)
import React, { useEffect, useRef, useState } from 'react';
import { Pencil } from 'lucide-react';

interface Props {
  lang: 'ar' | 'en';
  heading: string;
  initial: string;
  placeholder?: string;
  /** حقل ثانٍ اختياري (اسم المؤلف) */
  secondaryLabel?: string;
  secondaryInitial?: string;
  /** يعيد نص الخطأ أو null — يمنع الحفظ ويُعرض أسفل الحقول */
  validate?: (value: string, secondary: string) => string | null;
  onSave: (value: string, secondary: string) => void;
  onClose: () => void;
}

const RenameDialog: React.FC<Props> = ({ lang, heading, initial, placeholder, secondaryLabel, secondaryInitial = '', validate, onSave, onClose }) => {
  const isRTL = lang === 'ar';
  const [v, setV] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { const id = window.setTimeout(() => { ref.current?.focus(); ref.current?.select(); }, 120); return () => window.clearTimeout(id); }, []);
  const [s2, setS2] = useState(secondaryInitial);
  const changed = v.trim() !== initial.trim() || (secondaryLabel ? s2.trim() !== secondaryInitial.trim() : false);
  const err = v.trim() && changed && validate ? validate(v.trim(), s2.trim()) : null;
  const ok = v.trim().length > 0 && changed && !err;
  const save = () => { if (ok) onSave(v.trim(), s2.trim()); };
  const fieldStyle: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '12px 14px', color: '#fff', fontSize: 14, fontWeight: 700, outline: 'none' };

  return (
    <div className="fixed inset-0 flex items-center justify-center px-5" style={{ zIndex: 9900, background: 'rgba(0,0,0,0.85)' }} dir={isRTL ? 'rtl' : 'ltr'} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 360, background: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 22, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Pencil size={16} color="#ef4444" />
          <h3 style={{ color: '#fff', fontWeight: 900, fontSize: 15, margin: 0 }}>{heading}</h3>
        </div>
        <input
          ref={ref} value={v} onChange={e => setV(e.target.value)} placeholder={placeholder}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') onClose(); }}
          style={fieldStyle}
        />
        {secondaryLabel && (
          <input
            value={s2} onChange={e => setS2(e.target.value)} placeholder={secondaryLabel}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') onClose(); }}
            style={{ ...fieldStyle, marginTop: 10 }}
          />
        )}
        {err && <p style={{ color: '#f87171', fontSize: 11, fontWeight: 800, margin: '10px 2px 0', lineHeight: 1.6 }}>{err}</p>}
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button onClick={onClose} style={{ flex: 1, height: 42, borderRadius: 13, background: 'rgba(255,255,255,0.07)', color: '#fff', fontWeight: 800, fontSize: 13, border: 'none' }}>{isRTL ? 'تراجع' : 'Cancel'}</button>
          <button onClick={save} disabled={!ok} style={{ flex: 1, height: 42, borderRadius: 13, background: '#dc2626', color: '#fff', fontWeight: 900, fontSize: 13, border: 'none', opacity: ok ? 1 : 0.4 }}>{isRTL ? 'حفظ' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
};

export default RenameDialog;
