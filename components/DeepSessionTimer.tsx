import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Language, Book, DeepSession } from '../types';
import { translations } from '../i18n/translations';
import { deepSessionService } from '../services/deepSessionService';
import Reader from './Reader';
import {
  Timer, AlertTriangle, ShieldCheck, Star,
  Lock, X
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

  // ── DEEP SESSION TIMER STATE ──
  const [totalTargetSeconds, setTotalTargetSeconds] = useState(targetMinutes * 60);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [showForceEndConfirm, setShowForceEndConfirm] = useState(false);
  const [showExtendMenu, setShowExtendMenu] = useState(false);
  const [extensionCount, setExtensionCount] = useState(0);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // ── ZEN MODE: Auto-hide overlay after 40 seconds ──
  const [isOverlayVisible, setIsOverlayVisible] = useState(true);
  const zenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // ── ZEN MODE: Reset timer on any touch/interaction ──
  const resetZenTimer = useCallback(() => {
    setIsOverlayVisible(true);
    if (zenTimeoutRef.current) clearTimeout(zenTimeoutRef.current);
    zenTimeoutRef.current = setTimeout(() => {
      setIsOverlayVisible(false);
    }, 40000); // 40 seconds
  }, []);

  // Start zen timer on mount
  useEffect(() => {
    resetZenTimer();
    return () => {
      if (zenTimeoutRef.current) clearTimeout(zenTimeoutRef.current);
    };
  }, [resetZenTimer]);

  // Listen for global touch/mouse events to reset zen timer
  useEffect(() => {
    const handleActivity = () => resetZenTimer();
    window.addEventListener('touchstart', handleActivity, { passive: true });
    window.addEventListener('mousemove', handleActivity, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('mousemove', handleActivity);
    };
  }, [resetZenTimer]);

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

  // ── HANDLE READER'S onBack — show force-end dialog ──
  const handleReaderBack = useCallback(() => {
    setShowForceEndConfirm(true);
  }, []);

  // ── HANDLE READER'S onStatsUpdate — pass through ──
  const handleStatsUpdate = useCallback((_starReached?: number | null) => {
    // Reader handles its own book stats
  }, []);

  // ── COMPLETE SESSION ──
  const handleComplete = useCallback((forceEnd: boolean = false) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (zenTimeoutRef.current) clearTimeout(zenTimeoutRef.current);
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
  // SESSION COMPLETED — timer reached 0
  // ═══════════════════════════════════════════════════════════
  if (sessionCompleted) {
    return (
      <MotionDiv
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`fixed inset-0 z-[15000] bg-black flex items-center justify-center ${fontClass}`}
      >
        {/* Ambient glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <MotionDiv
            animate={{ scale: [1, 1.5, 1], opacity: [0.05, 0.15, 0.05] }}
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
  // MAIN RENDER — Reader (full features) + Deep Session Bottom Overlay
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
      {/* DEEP SESSION BOTTOM OVERLAY — Zen Mode Auto-hide      */}
      {/* Positioned to sit over Reader's bottom controls area  */}
      {/* ────────────────────────────────────────────────────── */}
      <MotionDiv
        initial={{ y: 30, opacity: 0 }}
        animate={{
          y: 0,
          opacity: isOverlayVisible ? 1 : 0.35,
        }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className="fixed bottom-0 left-0 right-0 z-[16000] pointer-events-none"
        style={{ direction: 'ltr' }}
      >
        <div className="pointer-events-auto mx-2 mb-2">
          <MotionDiv
            layout
            className="bg-black/80 backdrop-blur-2xl border border-white/[0.08] rounded-2xl overflow-hidden shadow-[0_-4px_30px_rgba(0,0,0,0.7)]"
          >
            {/* ── Main Timer Row ── */}
            <div className="px-4 py-2.5 flex items-center gap-3">
              {/* Lock + Countdown */}
              <div className="flex items-center gap-2 shrink-0">
                <div className={`w-5 h-5 rounded-md flex items-center justify-center ${
                  thresholdReached ? 'bg-emerald-600/20' : 'bg-red-600/20'
                }`}>
                  <Lock size={9} className={thresholdReached ? 'text-emerald-500' : 'text-red-500'} />
                </div>
                <span
                  className={`text-sm font-black tracking-[0.12em] leading-none ${
                    thresholdReached ? 'text-emerald-400' : 'text-white'
                  }`}
                  style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
                >
                  {formatTime(hours, minutes, seconds)}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="flex-1 relative">
                <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
                  <MotionDiv
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full rounded-full ${
                      thresholdReached
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                        : 'bg-gradient-to-r from-red-600/80 to-red-400'
                    }`}
                  />
                </div>
                {/* 80% Threshold Marker */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-0.5 h-2.5 rounded-full"
                  style={{
                    left: '80%',
                    backgroundColor: thresholdReached ? 'rgba(16,185,129,0.5)' : 'rgba(251,191,36,0.3)'
                  }}
                />
              </div>

              {/* Rewards Preview */}
              <div className="flex items-center gap-1 shrink-0 bg-white/[0.04] px-2 py-1 rounded-lg">
                <ShieldCheck size={9} className="text-amber-400/80" />
                <span className="text-[8px] font-black text-amber-400/80">{rewardsPreview.shields}</span>
                <Star size={8} className="text-amber-400/80 fill-amber-400/80" />
                <span className="text-[8px] font-black text-amber-400/80">{rewardsPreview.stars}</span>
              </div>

              {/* Force End Button */}
              <button
                onClick={() => setShowForceEndConfirm(true)}
                className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg bg-red-600/10 border border-red-600/15 text-red-500/70 hover:bg-red-600/30 hover:text-red-400 transition-all active:scale-90"
              >
                <X size={10} />
              </button>
            </div>

            {/* ── Percentage + Threshold Label ── */}
            <div className="px-4 pb-2 flex justify-between items-center">
              <span className="text-[7px] font-black uppercase tracking-widest text-white/15">
                {Math.round(progressPercent)}%
              </span>
              <span className={`text-[7px] font-black uppercase tracking-wider ${
                thresholdReached ? 'text-emerald-500/50' : 'text-amber-500/30'
              }`}>
                {thresholdReached ? t.deepSessionThresholdReached : t.deepSessionThreshold}
              </span>
            </div>
          </MotionDiv>
        </div>
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
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 20 }}
              className="bg-gradient-to-br from-[#1a0a0a] to-[#0a0a0a] border border-red-500/20 rounded-[2rem] p-8 max-w-sm w-full mx-4 text-center space-y-6 shadow-[0_0_80px_rgba(255,0,0,0.1)]"
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

              {/* Current Progress Info */}
              <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                <p className="text-xs font-black text-white/70 mb-1">
                  {isRTL ? 'التقدم الحالي' : 'Current Progress'}
                </p>
                <p className={`text-2xl font-black ${
                  progressPercent >= 80 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {Math.round(progressPercent)}%
                </p>
                <p className="text-[8px] text-white/30 mt-1 uppercase font-bold">
                  {Math.round(elapsedSeconds / 60)}/{Math.round(totalTargetSeconds / 60)} {isRTL ? 'دقيقة' : 'minutes'}
                </p>
                {progressPercent < 80 && (
                  <p className="text-[8px] text-red-400/80 mt-2 font-bold">
                    {isRTL ? '⚠️ لم تبلغ عتبة الـ 80% — لن تُحتسب المكافآت' : '⚠️ Below 80% threshold — no rewards will be earned'}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowForceEndConfirm(false)}
                  className="flex-1 py-4 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600/40 transition-all active:scale-95"
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
