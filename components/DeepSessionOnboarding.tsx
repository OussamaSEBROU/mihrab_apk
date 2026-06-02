import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Language, Book } from '../types';
import { translations } from '../i18n/translations';
import {
  Timer, BookOpen, ShieldCheck, Lock, AlertTriangle,
  ChevronDown, Sparkles, X, Leaf
} from 'lucide-react';

const MotionDiv = motion.div as any;

interface DeepSessionOnboardingProps {
  books: Book[];
  lang: Language;
  onStart: (bookId: string, minutes: number) => void;
  onCancel: () => void;
}

const TIME_OPTIONS = [
  { minutes: 90, hours: '1.5' },
  { minutes: 120, hours: '2.0' },
  { minutes: 150, hours: '2.5' },
  { minutes: 180, hours: '3.0' },
  { minutes: 210, hours: '3.5' },
  { minutes: 240, hours: '4.0' },
  { minutes: 270, hours: '4.5' },
  { minutes: 300, hours: '5.0' },
  { minutes: 330, hours: '5.5' },
  { minutes: 360, hours: '6.0' },
];

export const DeepSessionOnboarding: React.FC<DeepSessionOnboardingProps> = ({
  books, lang, onStart, onCancel
}) => {
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [selectedMinutes, setSelectedMinutes] = useState<number>(90);
  const [showBookDropdown, setShowBookDropdown] = useState(false);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [hasReadNotes, setHasReadNotes] = useState(false);

  const t = (translations as any)[lang];
  const isRTL = lang === 'ar';
  const fontClass = isRTL ? 'font-ar' : 'font-en';

  const selectedBook = useMemo(() => books.find(b => b.id === selectedBookId), [books, selectedBookId]);

  const notes = useMemo(() => [
    {
      icon: <Leaf size={18} className="text-emerald-400" />,
      color: 'border-emerald-500/30 bg-emerald-500/5',
      iconBg: 'bg-emerald-500/20',
      label: isRTL ? 'الاستعداد البيئي' : 'Environmental Readiness',
      text: t.deepSessionNoteEnv
    },
    {
      icon: <ShieldCheck size={18} className="text-amber-400" />,
      color: 'border-amber-500/30 bg-amber-500/5',
      iconBg: 'bg-amber-500/20',
      label: isRTL ? 'شرط الاحتساب الحديدي (80%)' : 'The 80% Iron Threshold',
      text: t.deepSessionNote80
    },
    {
      icon: <AlertTriangle size={18} className="text-blue-400" />,
      color: 'border-blue-500/30 bg-blue-500/5',
      iconBg: 'bg-blue-500/20',
      label: isRTL ? 'الاحتساب النسبي الذكي' : 'Smart Proportional Counting',
      text: t.deepSessionNotePartial
    },
    {
      icon: <Lock size={18} className="text-red-400" />,
      color: 'border-red-500/30 bg-red-500/5',
      iconBg: 'bg-red-500/20',
      label: isRTL ? 'الانغلاق التام' : 'Total Lockdown',
      text: t.deepSessionNoteLock
    }
  ], [isRTL, t]);

  const canStart = selectedBookId && selectedMinutes && hasReadNotes;

  return (
    <MotionDiv
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[16000] flex items-center justify-center bg-black/98 backdrop-blur-3xl overflow-hidden"
    >
      {/* Ambient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <MotionDiv
          animate={{ scale: [1, 1.3, 1], opacity: [0.04, 0.12, 0.04] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[90vw] rounded-full bg-red-600/15 blur-[120px]"
        />
        <MotionDiv
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.02, 0.08, 0.02] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-1/4 right-1/3 w-[70vw] h-[70vw] rounded-full bg-amber-500/8 blur-[100px]"
        />
      </div>

      {/* Scrollable Content */}
      <div className={`relative w-full h-full overflow-y-auto custom-scroll ${fontClass}`}>
        <div className="max-w-lg mx-auto px-5 py-8 space-y-6">
          {/* Header */}
          <MotionDiv
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center space-y-3"
          >
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:text-white transition-all border border-white/10"
            >
              <X size={18} />
            </button>

            <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-red-600/30 to-red-900/20 border border-red-500/30 shadow-[0_0_40px_rgba(255,0,0,0.2)] flex items-center justify-center mx-auto">
              <Timer size={28} className="text-red-400" />
            </div>

            <h1 className="text-2xl font-black text-white uppercase tracking-tighter italic">
              {t.deepSessionTitle}
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-600">
              {t.deepSessionSubtitle}
            </p>
          </MotionDiv>

          {/* Intellectual Quote — Glassmorphism Card */}
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="px-6 py-5 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl"
          >
            <p
              className={`text-center leading-[2] text-white/70 ${isRTL ? 'text-sm' : 'text-xs'}`}
              style={{ fontFamily: isRTL ? 'Alexandria, sans-serif' : 'Montserrat, sans-serif' }}
            >
              {t.deepSessionQuote}
            </p>
            <div className="mt-3 flex justify-center">
              <div className="w-8 h-px bg-gradient-to-r from-transparent via-red-600/50 to-transparent" />
            </div>
          </MotionDiv>

          {/* Warning Notes */}
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="space-y-3"
          >
            {notes.map((note, i) => (
              <MotionDiv
                key={i}
                initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                className={`p-4 rounded-xl border backdrop-blur-md ${note.color}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${note.iconBg} shrink-0 mt-0.5`}>
                    {note.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/60 mb-1">
                      {note.label}
                    </p>
                    <p className={`text-[10px] font-bold text-white/50 leading-relaxed ${isRTL ? '' : 'tracking-tight'}`}>
                      {note.text}
                    </p>
                  </div>
                </div>
              </MotionDiv>
            ))}
          </MotionDiv>

          {/* Acknowledgment Checkbox */}
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10"
          >
            <button
              onClick={() => setHasReadNotes(!hasReadNotes)}
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
                hasReadNotes
                  ? 'bg-red-600 border-red-600 shadow-[0_0_10px_rgba(255,0,0,0.4)]'
                  : 'border-white/20 bg-transparent'
              }`}
            >
              {hasReadNotes && <Sparkles size={10} className="text-white" />}
            </button>
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
              {isRTL ? 'قرأت وفهمت جميع الملاحظات أعلاه' : 'I have read and understood all notes above'}
            </span>
          </MotionDiv>

          {/* Book Selection */}
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="space-y-2"
          >
            <label className="text-[9px] font-black uppercase tracking-widest text-white/40 px-1">
              {t.deepSessionSelectBook}
            </label>
            <div className="relative">
              <button
                onClick={() => { setShowBookDropdown(!showBookDropdown); setShowTimeDropdown(false); }}
                className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-left flex items-center justify-between hover:border-red-600/30 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <BookOpen size={16} className="text-red-600 shrink-0" />
                  <span className={`text-xs font-bold truncate ${selectedBook ? 'text-white' : 'text-white/30'}`}>
                    {selectedBook ? selectedBook.title : (isRTL ? 'اختر كتاباً...' : 'Select a book...')}
                  </span>
                </div>
                <ChevronDown size={14} className={`text-white/30 transition-transform ${showBookDropdown ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showBookDropdown && (
                  <MotionDiv
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-[#0a0f0a] border border-white/10 rounded-xl shadow-2xl z-50 max-h-[40vh] overflow-y-auto custom-scroll"
                  >
                    {books.map(book => (
                      <button
                        key={book.id}
                        onClick={() => { setSelectedBookId(book.id); setShowBookDropdown(false); }}
                        className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-white/5 transition-all border-b border-white/5 last:border-0 ${
                          selectedBookId === book.id ? 'bg-red-600/10' : ''
                        }`}
                      >
                        {book.cover && book.cover !== '[VISUAL_PDF_MODE]' ? (
                          <img src={book.cover} className="w-8 h-11 rounded-md object-cover border border-white/10 shrink-0" alt="" />
                        ) : (
                          <div className="w-8 h-11 rounded-md bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                            <BookOpen size={12} className="text-white/20" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black text-white/80 truncate uppercase tracking-wider">{book.title}</p>
                          <p className="text-[8px] font-bold text-white/30 truncate">{book.author}</p>
                        </div>
                        {selectedBookId === book.id && (
                          <div className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_8px_rgba(255,0,0,0.8)] shrink-0" />
                        )}
                      </button>
                    ))}
                    {books.length === 0 && (
                      <div className="px-4 py-8 text-center text-[10px] font-bold text-white/20 uppercase">
                        {isRTL ? 'لا توجد كتب في المكتبة' : 'No books in library'}
                      </div>
                    )}
                  </MotionDiv>
                )}
              </AnimatePresence>
            </div>
          </MotionDiv>

          {/* Time Selection */}
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3 }}
            className="space-y-2"
          >
            <label className="text-[9px] font-black uppercase tracking-widest text-white/40 px-1">
              {t.deepSessionSelectTime}
            </label>
            <div className="relative">
              <button
                onClick={() => { setShowTimeDropdown(!showTimeDropdown); setShowBookDropdown(false); }}
                className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-left flex items-center justify-between hover:border-red-600/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Timer size={16} className="text-red-600" />
                  <span className="text-xs font-bold text-white">
                    {selectedMinutes}{isRTL ? ' دقيقة' : 'min'} ({(selectedMinutes / 60).toFixed(1)}{isRTL ? ' ساعة' : 'h'})
                  </span>
                </div>
                <ChevronDown size={14} className={`text-white/30 transition-transform ${showTimeDropdown ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showTimeDropdown && (
                  <MotionDiv
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-[#0a0f0a] border border-white/10 rounded-xl shadow-2xl z-50 max-h-[40vh] overflow-y-auto custom-scroll"
                  >
                    {TIME_OPTIONS.map(opt => (
                      <button
                        key={opt.minutes}
                        onClick={() => { setSelectedMinutes(opt.minutes); setShowTimeDropdown(false); }}
                        className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-white/5 transition-all border-b border-white/5 last:border-0 ${
                          selectedMinutes === opt.minutes ? 'bg-red-600/10' : ''
                        }`}
                      >
                        <span className="text-xs font-bold text-white/80">
                          {opt.minutes}{isRTL ? ' دقيقة' : 'min'} ({opt.hours}{isRTL ? ' ساعة' : 'h'})
                        </span>
                        {selectedMinutes === opt.minutes && (
                          <div className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_8px_rgba(255,0,0,0.8)]" />
                        )}
                      </button>
                    ))}
                  </MotionDiv>
                )}
              </AnimatePresence>
            </div>
          </MotionDiv>

          {/* Start Button */}
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4 }}
            className="pt-4 pb-8 space-y-3"
          >
            <button
              onClick={() => canStart && onStart(selectedBookId, selectedMinutes)}
              disabled={!canStart}
              className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.4em] transition-all active:scale-95 flex items-center justify-center gap-3 ${
                canStart
                  ? 'bg-red-600 text-white shadow-[0_0_40px_rgba(255,0,0,0.3)] hover:bg-red-500'
                  : 'bg-white/5 text-white/20 cursor-not-allowed'
              }`}
            >
              <Timer size={16} />
              {t.deepSessionStart}
            </button>

            <button
              onClick={onCancel}
              className="w-full py-3 rounded-xl bg-transparent text-white/30 font-black text-[10px] uppercase tracking-widest hover:text-white/60 transition-all"
            >
              {t.deepSessionCancel}
            </button>
          </MotionDiv>
        </div>
      </div>
    </MotionDiv>
  );
};
