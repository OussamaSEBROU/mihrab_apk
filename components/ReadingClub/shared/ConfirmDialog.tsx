import React from 'react';
import { motion } from 'framer-motion';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';

const MotionDiv = motion.div as any;

interface ConfirmDialogProps {
  lang: 'ar' | 'en';
  kind?: 'delete' | 'warning';
  title: string;
  itemName?: string;
  operationLabel?: string;
  consequencesLabel?: string;
  permanenceLabel?: string;
  confirmPhrase?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

// Same visual language as the book-delete modal in App.tsx
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  lang,
  kind = 'delete',
  title,
  itemName,
  operationLabel,
  consequencesLabel,
  permanenceLabel,
  confirmPhrase,
  loading = false,
  onCancel,
  onConfirm
}) => {
  const isRTL = lang === 'ar';
  const [typed, setTyped] = React.useState('');
  const phraseOk = !confirmPhrase || typed.trim() === confirmPhrase;

  const rows = [
    { label: isRTL ? 'العنصر' : 'ITEM', value: itemName },
    { label: isRTL ? 'العملية' : 'ACTION', value: operationLabel },
    { label: isRTL ? 'الآثار' : 'EFFECT', value: consequencesLabel },
    { label: isRTL ? 'التراجع' : 'REVERSIBLE', value: permanenceLabel }
  ].filter(r => !!r.value);

  return (
    <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[11000] flex items-center justify-center p-6 bg-black/98 backdrop-blur-3xl">
      <MotionDiv initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#0b140b] border border-white/10 p-10 rounded-[4rem] w-full max-w-md text-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="w-20 h-20 rounded-full bg-red-600/10 flex items-center justify-center mx-auto mb-6">
          {kind === 'delete' ? <Trash2 className="text-red-600" size={32} /> : <AlertTriangle className="text-red-600" size={32} />}
        </div>
        <h2 className="text-2xl font-black text-white uppercase mb-4">{title}</h2>
        {rows.length > 0 && (
          <div className="space-y-2 mb-6">
            {rows.map(row => (
              <div key={row.label} className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-left rtl:text-right">
                <p className="text-[8px] font-black uppercase tracking-widest text-red-500/80 mb-1">{row.label}</p>
                <p className="text-[10px] text-white/70 leading-relaxed">{row.value}</p>
              </div>
            ))}
          </div>
        )}
        {rows.length === 0 && <div className="mb-8" />}
        {confirmPhrase && (
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-center text-white font-black mb-4"
            placeholder={confirmPhrase}
            disabled={loading}
          />
        )}
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-4 rounded-2xl bg-white/5 text-white/40 font-black uppercase text-[10px] disabled:opacity-20"
          >
            {isRTL ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || !phraseOk}
            className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-black uppercase text-[10px] disabled:opacity-20 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={12} className="animate-spin" />}
            {isRTL ? 'تأكيد' : 'Confirm'}
          </button>
        </div>
      </MotionDiv>
    </MotionDiv>
  );
};

export default ConfirmDialog;
