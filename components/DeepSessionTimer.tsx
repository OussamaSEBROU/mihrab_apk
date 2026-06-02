import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Language, Book, DeepSession } from '../types';
import { translations } from '../i18n/translations';
import { deepSessionService } from '../services/deepSessionService';
import Reader from './Reader';
import {
  Timer, AlertTriangle, ShieldCheck, Star,
  ChevronUp, ChevronDown, Lock, Sparkles, X
} from 'lucide-react';

const MotionDiv = motion.div as any;

interface DeepSessionTimerProps {
  book: Book;
  targetMinutes: number;
  lang: Language;
  onComplete: (session: any) => void;
  onCancel: () => void;
}

const DeepSessionTimer: React.FC<DeepSessionTimerProps> = ({
  book, targetMinutes, lang, onComplete, onCancel
}) => {
  const t = (translations as any)[lang];
  const isRTL = lang === 'ar';
  const fontClass = isRTL ? 'font-ar' : 'font-en';

  // ── DEEP SESSION TIMER STATE (independent of Reader's own timer) ──
  const [totalTargetSeconds, setTotalTargetSeconds] = useState(targetMinutes * 60);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [showForceEndConfirm, setShowForceEndConfirm] = useState(false);
  const [showExtendMenu, setShowExtendMenu] = useState(false);
  const [extensionCount, setExtensionCount] = useState(0);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [isTimerBarCollapsed, setIsTimerBarCollapsed] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // ── COMPUTED VALUES ──
  const remainingSeconds = Math.max(0, totalTargetSeconds - elapsedSeconds);
  const progressPercent = Math.min(100, (elapsedSeconds / totalTargetSeconds) * 100);
  const thresholdReached = progressPercent >= 80;
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;
  const formatTime = (h: number, m: number, s: number) =>
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  // ── REWARDS PREVIEW (live) ──
  const rewardsPreview = useMemo(() => {
    return deepSessionService.calculateRewards(
      totalTargetSeconds / 60,
      elapsedSeconds / 60,
      progressPercent
    );
  }, [totalTargetSeconds, elapsedSeconds, progressPercent]);

  // ── DEEP SESSION COUNTDOWN TIMER ──
  useEffect(() => {
    if (isRunning && !sessionCompleted) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => {
          const next = prev + 1;
          if (next >= totalTargetSeconds) {
            setSessionCompleted(true);
            setIsRunning(false);
          }
          return next;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, totalTargetSeconds, sessionCompleted]);

  // ── BACK BUTTON PROTECTION ──
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // ── HANDLE READER'S onBack — intercept to show force-end confirmation ──
  const handleReaderBack = useCallback(() => {
    setShowForceEndConfirm(true);
  }, []);

  // ── HANDLE READER'S onStatsUpdate — pass through normally ──
  const handleStatsUpdate = useCallback((starReached?: number | null) => {
    // Reader handles its own book stats; we don't interfere
  }, []);

  // ── COMPLETE SESSION (called on natural end or force end) ──
  const handleComplete = useCallback((forceEnd: boolean = false) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);

    const actualMinutes = elapsedSeconds / 60;
    const session = deepSessionService.createSession(
      book.id,
      book.title,
      book.contentHash || '',
      totalTargetSeconds / 60,
      actualMinutes
    );
    session.wasExtended = extensionCount > 0;
    session.extensionCount = extensionCount;

    onComplete(session);
  }, [elapsedSeconds, totalTargetSeconds, book, extensionCount, onComplete]);

  // ── FORCE END ──
  const handleForceEnd = useCallback(() => {
    setShowForceEndConfirm(false);
    handleComplete(true);
  }, [handleComplete]);

  // ── EXTEND SESSION ──
  const handleExtend = useCallback((extraMinutes: number) => {
    setTotalTargetSeconds(prev => prev + extraMinutes * 60);
    setExtensionCount(prev => prev + 1);
    setSessionCompleted(false);
    setIsRunning(true);
    setShowExtendMenu(false);
  }, []);

  // ═══════════════════════════════════════════════════════════
  // SESSION COMPLETED OVERLAY — shown when timer reaches 0
  // ═══════════════════════════════════════════════════════════
  if (sessionCompleted) {
    return (
      <MotionDiv
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`fixed inset-0 z-[15000] bg-black flex items-center justify-center ${fontClass}`}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <MotionDiv
            animate={{ scale: [1, 1.5, 1], opacity: [0.05, 0.2, 0.05] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[80vw] h-[80vw] rounded-full bg-emerald-600/20 blur-[100px]"
          />
        </div>

        <div className="relative text-center px-8 max-w-md space-y-8">
          <MotionDiv
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            className="w-24 h-24 rounded-full bg-emerald-600/20 border-2 border-emerald-500/40 flex items-center justify-center mx-auto shadow-[0_0_60px_rgba(16,185,129,0.3)]"
          >
            <ShieldCheck size={40} className="text-emerald-400" />
          </MotionDiv>

          <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">
            {t.deepSessionCompleteTitle}
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
              <ShieldCheck size={20} className="text-amber-400 mx-auto mb-2" />
              <p className="text-2xl font-black text-white">{rewardsPreview.shields}</p>
              <p className="text-[8px] font-black uppercase text-white/40 tracking-widest">{t.deepSessionShieldsEarned}</p>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
              <Star size={20} className="text-amber-400 fill-amber-400 mx-auto mb-2" />
              <p className="text-2xl font-black text-white">{rewardsPreview.stars}</p>
              <p className="text-[8px] font-black uppercase text-white/40 tracking-widest">{t.deepSessionStarsEarned}</p>
            </div>
          </div>

          <p className="text-xs text-white/50 uppercase font-bold">
            {isRTL
              ? `${Math.round(elapsedSeconds / 60)} دقيقة من أصل ${Math.round(totalTargetSeconds / 60)} دقيقة (100%)`
              : `${Math.round(elapsedSeconds / 60)} of ${Math.round(totalTargetSeconds / 60)} minutes (100%)`}
          </p>

          <div className="space-y-3">
            <button
              onClick={() => handleComplete(false)}
              className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-black text-xs uppercase tracking-[0.3em] shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:bg-emerald-500 active:scale-95 transition-all"
            >
              {t.deepSessionReturn}
            </button>
            <button
              onClick={() => setShowExtendMenu(true)}
              className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white/60 font-black text-xs uppercase tracking-widest hover:text-white hover:border-red-600/30 transition-all"
            >
              {t.deepSessionExtend}
            </button>
          </div>
        </div>

        {/* Extend Menu Modal */}
        <AnimatePresence>
          {showExtendMenu && (
            <MotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[16000] flex items-center justify-center bg-black/80 backdrop-blur-md"
            >
              <MotionDiv
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="bg-[#0a0f0a] border border-white/10 rounded-[2rem] p-8 max-w-sm w-full mx-4 space-y-4"
              >
                <h3 className="text-lg font-black text-white uppercase tracking-tight text-center">
                  {t.deepSessionExtend}
                </h3>
                <p className="text-[10px] text-white/40 text-center uppercase font-bold">
                  {t.deepSessionExtendMsg}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[90, 120, 150, 180, 210, 240, 270, 300, 330, 360].map(min => (
                    <button
                      key={min}
                      onClick={() => handleExtend(min)}
                      className="px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white/70 hover:bg-red-600/20 hover:border-red-600/30 transition-all"
                    >
                      {min}{isRTL ? ' د' : 'm'} ({(min / 60).toFixed(1)}{isRTL ? ' س' : 'h'})
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowExtendMenu(false)}
                  className="w-full py-3 rounded-xl bg-transparent text-white/30 font-black text-[10px] uppercase tracking-widest hover:text-white/60 transition-all"
                >
                  {t.deepSessionCancel}
                </button>
              </MotionDiv>
            </MotionDiv>
          )}
        </AnimatePresence>
      </MotionDiv>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // MAIN RENDER — Reader (full features) + Deep Session Overlay
  // ═══════════════════════════════════════════════════════════
  return (
    <div className={`fixed inset-0 z-[15000] bg-black ${fontClass}`}>
      {/* ────────────────────────────────────────────────────── */}
      {/* THE REAL READER — all original features intact        */}
      {/* ────────────────────────────────────────────────────── */}
      <Reader
        key={book.id}
        book={book}
        lang={lang}
        onBack={handleReaderBack}
        onStatsUpdate={handleStatsUpdate}
      />

      {/* ────────────────────────────────────────────────────── */}
      {/* DEEP SESSION FLOATING OVERLAY — Timer Bar on top      */}
      {/* ────────────────────────────────────────────────────── */}
      <MotionDiv
        initial={{ y: -60 }}
        animate={{ y: 0 }}
        className="fixed top-0 left-0 right-0 z-[16000] pointer-events-none"
      >
        {/* Collapsed Mini Bar */}
        {isTimerBarCollapsed ? (
          <div className="pointer-events-auto flex justify-center pt-1">
            <button
              onClick={() => setIsTimerBarCollapsed(false)}
              className="flex items-center gap-2 px-4 py-1.5 bg-black/80 backdrop-blur-xl rounded-b-xl border border-white/10 border-t-0 shadow-2xl"
            >
              <Lock size={10} className="text-red-600" />
              <span className="text-[9px] font-black text-white tracking-[0.15em]" style={{ fontFamily: 'monospace' }}>
                {formatTime(hours, minutes, seconds)}
              </span>
              {/* Mini progress dot */}
              <div className={`w-1.5 h-1.5 rounded-full ${thresholdReached ? 'bg-emerald-500' : 'bg-red-600'} animate-pulse`} />
              <ChevronDown size={10} className="text-white/30" />
            </button>
          </div>
        ) : (
          /* Expanded Timer Bar */
          <div className="pointer-events-auto mx-3 mt-14 md:mt-16">
            <MotionDiv
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-black/85 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.8)]"
            >
              {/* Row 1: Lock icon + Countdown + Rewards + Collapse */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-red-600/20 flex items-center justify-center">
                    <Lock size={10} className="text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white tracking-[0.15em] leading-none" style={{ fontFamily: 'monospace' }}>
                      {formatTime(hours, minutes, seconds)}
                    </p>
                    <p className="text-[6px] font-black uppercase tracking-widest text-white/25 mt-0.5">
                      {t.deepSessionCountdown}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Live Rewards */}
                  <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-full">
                    <ShieldCheck size={9} className="text-amber-400" />
                    <span className="text-[8px] font-black text-amber-400">{rewardsPreview.shields}</span>
                    <div className="w-px h-2 bg-white/10" />
                    <Star size={9} className="text-amber-400 fill-amber-400" />
                    <span className="text-[8px] font-black text-amber-400">{rewardsPreview.stars}</span>
                  </div>

                  {/* Collapse button */}
                  <button
                    onClick={() => setIsTimerBarCollapsed(true)}
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 text-white/30 hover:text-white transition-all"
                  >
                    <ChevronUp size={12} />
                  </button>
                </div>
              </div>

              {/* Row 2: Progress Bar with 80% threshold */}
              <div className="relative">
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <MotionDiv
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.5 }}
                    className={`h-full rounded-full transition-colors duration-500 ${
                      thresholdReached
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                        : 'bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_8px_rgba(255,0,0,0.5)]'
                    }`}
                  />
                </div>
                {/* 80% Threshold Marker */}
                <div className="absolute top-0 bottom-0 flex items-center" style={{ left: '80%' }}>
                  <div className={`w-px h-full ${thresholdReached ? 'bg-emerald-500' : 'bg-amber-500/50'}`} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[6px] font-black uppercase text-white/20">
                    {Math.round(progressPercent)}%
                  </span>
                  <span className={`text-[6px] font-black uppercase tracking-wider ${thresholdReached ? 'text-emerald-500' : 'text-amber-500/50'}`}>
                    {thresholdReached ? t.deepSessionThresholdReached : t.deepSessionThreshold}
                  </span>
                </div>
              </div>

              {/* Row 3: Force End Button (small, bottom-right) */}
              <div className="flex justify-end mt-1">
                <button
                  onClick={() => setShowForceEndConfirm(true)}
                  className="px-3 py-1 rounded-lg bg-red-600/10 border border-red-600/15 text-red-500 text-[7px] font-black uppercase tracking-wider hover:bg-red-600/30 transition-all active:scale-95"
                >
                  {t.deepSessionForceEnd}
                </button>
              </div>
            </MotionDiv>
          </div>
        )}
      </MotionDiv>

      {/* ────────────────────────────────────────────────────── */}
      {/* FORCE END CONFIRMATION MODAL                          */}
      {/* ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showForceEndConfirm && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[17000] flex items-center justify-center bg-black/80 backdrop-blur-lg"
          >
            <MotionDiv
              initial={{ scale: 0.85 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.85 }}
              className="bg-gradient-to-br from-red-900/40 to-black border border-red-500/30 rounded-[2rem] p-8 max-w-sm w-full mx-4 text-center space-y-6"
            >
              <div className="w-16 h-16 rounded-full bg-red-600/10 flex items-center justify-center mx-auto border border-red-600/20">
                <AlertTriangle size={28} className="text-red-400" />
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">
                {t.deepSessionForceEnd}
              </h3>
              <p className="text-[10px] text-white/50 leading-relaxed uppercase font-bold">
                {t.deepSessionForceEndConfirm}
              </p>
              <p className="text-xs font-black text-white/70">
                {isRTL ? `التقدم الحالي: ${Math.round(progressPercent)}%` : `Current progress: ${Math.round(progressPercent)}%`}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowForceEndConfirm(false)}
                  className="flex-1 py-4 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600/40 transition-all"
                >
                  {t.deepSessionForceEndNo}
                </button>
                <button
                  onClick={handleForceEnd}
                  className="flex-1 py-4 rounded-xl bg-red-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-red-500 transition-all active:scale-95"
                >
                  {t.deepSessionForceEndYes}
                </button>
              </div>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DeepSessionTimer;
