import React from 'react';
import { motion } from 'framer-motion';
import type { Language, DeepSession } from '../types';
import { translations } from '../i18n/translations';
import {
  ShieldCheck, Star, Timer, BookOpen, Sparkles,
  ArrowRight, TrendingUp, Check, X
} from 'lucide-react';

const MotionDiv = motion.div as any;

interface DeepSessionCompleteProps {
  session: DeepSession;
  lang: Language;
  onReturn: () => void;
}

export const DeepSessionComplete: React.FC<DeepSessionCompleteProps> = ({
  session, lang, onReturn
}) => {
  const t = (translations as any)[lang];
  const isRTL = lang === 'ar';
  const fontClass = isRTL ? 'font-ar' : 'font-en';

  const isSuccess = session.isCompleted;
  const isPerfect = session.isPerfect;

  const accentColor = isPerfect ? 'emerald' : isSuccess ? 'amber' : 'red';
  const iconColors: Record<string, string> = {
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-red-400'
  };
  const bgGlow: Record<string, string> = {
    emerald: 'bg-emerald-600/15',
    amber: 'bg-amber-600/15',
    red: 'bg-red-600/15'
  };
  const borderGlow: Record<string, string> = {
    emerald: 'border-emerald-500/30',
    amber: 'border-amber-500/30',
    red: 'border-red-500/30'
  };
  const shadowGlow: Record<string, string> = {
    emerald: 'shadow-[0_0_60px_rgba(16,185,129,0.3)]',
    amber: 'shadow-[0_0_60px_rgba(245,158,11,0.3)]',
    red: 'shadow-[0_0_60px_rgba(255,0,0,0.3)]'
  };

  // Dynamic message
  const getMessage = () => {
    if (isPerfect) {
      return t.deepSessionCompleteMsg
        .replace('{min}', Math.round(session.actualMinutes).toString())
        .replace('{book}', session.bookTitle)
        .replace('{badges}', (session.shieldsEarned + session.starsEarned).toString());
    } else if (isSuccess) {
      return t.deepSessionIncompleteMsg
        .replace('{percent}', session.completionPercentage.toString());
    } else {
      return t.deepSessionFailedMsg;
    }
  };

  const getTitle = () => {
    if (isPerfect) return t.deepSessionCompleteTitle;
    if (isSuccess) return t.deepSessionIncompleteTitle;
    return t.deepSessionFailedTitle;
  };

  return (
    <MotionDiv
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-[15000] bg-black flex items-center justify-center ${fontClass}`}
    >
      {/* Ambient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <MotionDiv
          animate={{ scale: [1, 1.5, 1], opacity: [0.04, 0.15, 0.04] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[90vw] rounded-full ${bgGlow[accentColor]} blur-[120px]`}
        />
      </div>

      <div className="relative w-full max-w-md px-6 space-y-8 text-center">
        {/* Icon */}
        <MotionDiv
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 12, delay: 0.2 }}
          className={`w-24 h-24 rounded-full ${bgGlow[accentColor]} border-2 ${borderGlow[accentColor]} flex items-center justify-center mx-auto ${shadowGlow[accentColor]}`}
        >
          {isPerfect ? (
            <Sparkles size={40} className={iconColors[accentColor]} />
          ) : isSuccess ? (
            <Check size={40} className={iconColors[accentColor]} />
          ) : (
            <X size={40} className={iconColors[accentColor]} />
          )}
        </MotionDiv>

        {/* Title */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic mb-2">
            {getTitle()}
          </h2>
          <p className="text-xs text-white/50 uppercase font-bold leading-relaxed">
            {getMessage()}
          </p>
        </MotionDiv>

        {/* Stats Grid */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-2 gap-3"
        >
          {/* Duration */}
          <div className="p-4 bg-white/[0.04] rounded-2xl border border-white/10 text-center">
            <Timer size={18} className="text-white/40 mx-auto mb-2" />
            <p className="text-xl font-black text-white italic">{Math.round(session.actualMinutes)}</p>
            <p className="text-[7px] font-black uppercase text-white/30 tracking-widest">
              {t.deepSessionMinutes}
            </p>
          </div>

          {/* Completion */}
          <div className="p-4 bg-white/[0.04] rounded-2xl border border-white/10 text-center">
            <TrendingUp size={18} className={`${iconColors[accentColor]} mx-auto mb-2`} />
            <p className="text-xl font-black text-white italic">{session.completionPercentage}%</p>
            <p className="text-[7px] font-black uppercase text-white/30 tracking-widest">
              {t.deepSessionProgress}
            </p>
          </div>

          {/* Shields */}
          {isSuccess && (
            <div className="p-4 bg-white/[0.04] rounded-2xl border border-white/10 text-center">
              <ShieldCheck size={18} className="text-amber-400 mx-auto mb-2" />
              <p className="text-xl font-black text-white italic">{session.shieldsEarned}</p>
              <p className="text-[7px] font-black uppercase text-white/30 tracking-widest">
                {t.deepSessionShieldsEarned}
              </p>
            </div>
          )}

          {/* Stars */}
          {isSuccess && (
            <div className="p-4 bg-white/[0.04] rounded-2xl border border-white/10 text-center">
              <Star size={18} className="text-amber-400 fill-amber-400 mx-auto mb-2" />
              <p className="text-xl font-black text-white italic">{session.starsEarned}</p>
              <p className="text-[7px] font-black uppercase text-white/30 tracking-widest">
                {t.deepSessionStarsEarned}
              </p>
            </div>
          )}
        </MotionDiv>

        {/* Book Info */}
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex items-center justify-center gap-3 px-4 py-3 bg-white/[0.03] rounded-xl border border-white/5"
        >
          <BookOpen size={14} className="text-red-600 shrink-0" />
          <span className="text-[10px] font-black text-white/60 uppercase tracking-wider truncate">
            {session.bookTitle}
          </span>
          {session.wasExtended && (
            <span className="text-[8px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 shrink-0">
              {t.deepSessionExtended} ×{session.extensionCount}
            </span>
          )}
        </MotionDiv>

        {/* Target vs Actual */}
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="flex items-center justify-center gap-6 text-[10px] font-bold uppercase tracking-wider text-white/30"
        >
          <span>{t.deepSessionHistoryTarget}: {session.targetMinutes}{isRTL ? 'د' : 'm'}</span>
          <ArrowRight size={12} className="text-white/10" />
          <span>{t.deepSessionHistoryActual}: {Math.round(session.actualMinutes)}{isRTL ? 'د' : 'm'}</span>
        </MotionDiv>

        {/* Return Button */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="pt-4 pb-8"
        >
          <button
            onClick={onReturn}
            className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.4em] shadow-2xl hover:brightness-110 active:scale-95 transition-all ${
              isSuccess
                ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                : 'bg-white/10 text-white/60 border border-white/10'
            }`}
          >
            {t.deepSessionReturn}
          </button>
        </MotionDiv>
      </div>
    </MotionDiv>
  );
};
