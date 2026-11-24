// ══════════════════════════════════════════════════════════════
// ANNOTATION EDITOR — واجهة التدوين والتهميش (Reader)
// ──────────────────────────────────────────────────────────────
// محرك لوحة المفاتيح الخالي من التأخر (Zero-Lag):
//  • نص المسودة (العنوان/الملاحظة) يعيش في حالة محلية داخل هذا المكوّن فقط،
//    فالضغط على أي حرف يعيد رسم هذا المكوّن الصغير وحده — لا القارئ ولا قائمة
//    الملاحظات ولا صور الصفحات ولا قاعدة البيانات.
//  • الحفظ إلى القارئ/التخزين يتم بعد توقف الكتابة (Debounce 1.2s) وعند الإغلاق/الحفظ
//    وعند فقدان التركيز، عبر onCommit.
// ══════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Check, Trash2, Highlighter, Underline, BoxSelect, MessageSquare } from 'lucide-react';
import type { Annotation, Language } from '../types';

const MotionDiv = motion.div as any;

const TYPE_META: Record<Annotation['type'], { icon: any; ar: string; en: string }> = {
  highlight: { icon: Highlighter, ar: 'تظليل', en: 'Highlight' },
  underline: { icon: Underline, ar: 'تسطير', en: 'Underline' },
  box: { icon: BoxSelect, ar: 'إطار', en: 'Frame' },
  note: { icon: MessageSquare, ar: 'ملاحظة', en: 'Note' },
};

const TITLE_MAX = 120;
const TEXT_MAX = 4000;
const COMMIT_DELAY_MS = 1200;

export interface AnnotationPatch {
  title?: string;
  text?: string;
  color?: string;
}

interface Props {
  lang: Language;
  /** يُقرأ مرة واحدة عند الفتح (المسودة محلية بعد ذلك) */
  annotation: Annotation;
  colors: { name: string; hex: string }[];
  onCommit: (id: string, patch: AnnotationPatch) => void;
  onDelete: (id: string) => void;
  /** يُستدعى عند الإغلاق؛ saved=true عند الضغط على زر الحفظ */
  onClose: (saved: boolean) => void;
}

const AnnotationEditor: React.FC<Props> = ({ lang, annotation, colors, onCommit, onDelete, onClose }) => {
  const isRTL = lang === 'ar';
  const meta = TYPE_META[annotation.type] || TYPE_META.note;
  const TypeIcon = meta.icon;

  const [title, setTitle] = useState(annotation.title || '');
  const [text, setText] = useState(annotation.text || '');
  const [color, setColor] = useState(annotation.color);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // مراجع للقيم الحالية كي لا تتغير هوية الدوال أثناء الكتابة
  const draftRef = useRef<AnnotationPatch>({});
  const dirtyRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;
  const idRef = useRef(annotation.id);

  const flush = useCallback(() => {
    if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null; }
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    const patch = draftRef.current;
    draftRef.current = {};
    onCommitRef.current(idRef.current, patch);
  }, []);

  const schedule = useCallback((patch: AnnotationPatch) => {
    draftRef.current = { ...draftRef.current, ...patch };
    dirtyRef.current = true;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(flush, COMMIT_DELAY_MS);
  }, [flush]);

  // ضمان عدم فقدان أي حرف عند إغلاق المكوّن لأي سبب
  useEffect(() => () => flush(), [flush]);

  // تركيز تلقائي للعنصر الجديد فقط (بعد انتهاء حركة الظهور)
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (annotation.title || annotation.text) return;
    const id = window.setTimeout(() => titleRef.current?.focus({ preventScroll: true }), 280);
    return () => window.clearTimeout(id);
  }, [annotation.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // حقل الملاحظة يتمدد تلقائياً (بحد أقصى) دون إعادة رسم أي شيء آخر
  const textRef = useRef<HTMLTextAreaElement>(null);
  const autosize = useCallback(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, []);
  useLayoutEffect(autosize, [text, autosize]);

  const handleSave = () => { flush(); onClose(true); };
  const handleClose = () => { flush(); onClose(false); };

  return (
    <MotionDiv
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[4000] bg-black/60 backdrop-blur-lg flex items-end md:items-center justify-center p-3 md:p-6 pointer-events-auto"
      dir={isRTL ? 'rtl' : 'ltr'}
      onClick={handleClose}
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <MotionDiv
        initial={{ y: 40, opacity: 0.6 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        className="w-full max-w-[420px] max-h-[92dvh] flex flex-col rounded-[2rem] border border-white/10 bg-black/55 backdrop-blur-2xl shadow-[0_30px_80px_rgba(0,0,0,0.75)] overflow-hidden"
      >
        {/* ── Header ── */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-5 pt-5 pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center border border-white/10 transition-colors"
              style={{ backgroundColor: `${color}26`, color }}
            >
              <TypeIcon size={16} />
            </span>
            <div className="min-w-0">
              <h3 className="text-[13px] font-black text-white/95 truncate">
                {isRTL ? 'بيانات التعديل' : 'Annotation Details'}
              </h3>
              <p className="text-[10px] font-bold text-white/35 truncate">
                {isRTL ? `${meta.ar} · صفحة ${annotation.pageIndex + 1}` : `${meta.en} · Page ${annotation.pageIndex + 1}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label={isRTL ? 'إغلاق' : 'Close'}
            className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/50 active:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Fields ── */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-2 space-y-3 overscroll-contain">
          <div>
            <label className="block mb-1.5 text-[10px] font-black text-white/40">{isRTL ? 'العنوان' : 'Title'}</label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              maxLength={TITLE_MAX}
              enterKeyHint="next"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => { const v = e.target.value; setTitle(v); schedule({ title: v }); }}
              onBlur={flush}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); textRef.current?.focus(); } }}
              className="w-full rounded-2xl bg-white/[0.06] border border-white/10 px-4 py-3 text-[13px] font-bold text-white outline-none focus:border-white/30 focus:bg-white/[0.09] placeholder:text-white/20 transition-colors"
              placeholder={isRTL ? 'عنوان التعديل...' : 'Entry title...'}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-black text-white/40">{isRTL ? 'ملاحظات استخلاص الحكمة' : 'Wisdom notes'}</label>
              <span className="text-[9px] font-bold text-white/20 tabular-nums">{text.length}/{TEXT_MAX}</span>
            </div>
            <textarea
              ref={textRef}
              value={text}
              maxLength={TEXT_MAX}
              rows={3}
              spellCheck={false}
              onChange={(e) => { const v = e.target.value; setText(v); schedule({ text: v }); }}
              onBlur={flush}
              className="w-full rounded-2xl bg-white/[0.06] border border-white/10 px-4 py-3 text-[13px] leading-relaxed font-medium text-white outline-none focus:border-white/30 focus:bg-white/[0.09] placeholder:text-white/20 resize-none transition-colors"
              style={{ minHeight: 92, maxHeight: 180 }}
              placeholder={isRTL ? 'ملاحظات استخلاص الحكمة...' : 'Wisdom notes...'}
            />
          </div>

          <div>
            <label className="block mb-2 text-[10px] font-black text-white/40">{isRTL ? 'اللون' : 'Color'}</label>
            <div className="flex items-center justify-between gap-2">
              {colors.map(c => {
                const active = color === c.hex;
                return (
                  <button
                    key={c.hex}
                    type="button"
                    aria-label={c.name}
                    aria-pressed={active}
                    onClick={() => { setColor(c.hex); schedule({ color: c.hex }); flush(); }}
                    className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-90 ${active ? 'scale-110' : 'opacity-70'}`}
                    style={{
                      backgroundColor: c.hex,
                      boxShadow: active ? `0 0 0 2px rgba(0,0,0,0.6), 0 0 0 4px ${c.hex}, 0 0 18px ${c.hex}88` : 'none',
                    }}
                  >
                    {active && <Check size={16} className="text-white drop-shadow" strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 px-5 pt-3 pb-5 flex items-center gap-2.5 border-t border-white/5 mt-2">
          {confirmDelete ? (
            <>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-4 h-12 rounded-2xl bg-white/5 border border-white/10 text-[11px] font-black text-white/60 active:bg-white/10"
              >
                {isRTL ? 'تراجع' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => { dirtyRef.current = false; if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null; } onDelete(annotation.id); }}
                className="flex-1 h-12 rounded-2xl bg-red-600 text-[11px] font-black text-white flex items-center justify-center gap-2 active:bg-red-500"
              >
                <Trash2 size={14} />
                {isRTL ? 'تأكيد الحذف نهائياً' : 'Delete permanently'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                aria-label={isRTL ? 'حذف' : 'Delete'}
                className="w-12 h-12 shrink-0 rounded-2xl bg-red-600/10 border border-red-600/25 text-red-500 flex items-center justify-center active:bg-red-600 active:text-white"
              >
                <Trash2 size={16} />
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 h-12 rounded-2xl bg-white text-black text-[12px] font-black flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <Check size={15} strokeWidth={3} />
                {isRTL ? 'حفظ بالفهرس' : 'Save to Index'}
              </button>
            </>
          )}
        </div>
      </MotionDiv>
    </MotionDiv>
  );
};

export default React.memo(AnnotationEditor);
