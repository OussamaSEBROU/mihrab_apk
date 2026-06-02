import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Language, Book } from '../types';
import { translations } from '../i18n/translations';
import { deepSessionService } from '../services/deepSessionService';
import { pdfStorage } from '../services/pdfStorage';
import {
  Timer, AlertTriangle, X, BookOpen, ShieldCheck,
  Star, ChevronRight, Pause, Play, Lock
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

  // ── TIMER STATE ──
  const [totalTargetSeconds, setTotalTargetSeconds] = useState(targetMinutes * 60);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [showForceEndConfirm, setShowForceEndConfirm] = useState(false);
  const [showExtendMenu, setShowExtendMenu] = useState(false);
  const [extensionCount, setExtensionCount] = useState(0);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // ── PDF STATE ──
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(book.lastPage || 1);
  const [totalPages, setTotalPages] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<any>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // ── COMPUTED VALUES ──
  const remainingSeconds = Math.max(0, totalTargetSeconds - elapsedSeconds);
  const progressPercent = Math.min(100, (elapsedSeconds / totalTargetSeconds) * 100);
  const thresholdReached = progressPercent >= 80;
  const isComplete = remainingSeconds <= 0;

  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  const formatTime = (h: number, m: number, s: number) =>
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  // ── REWARDS PREVIEW ──
  const rewardsPreview = useMemo(() => {
    return deepSessionService.calculateRewards(
      totalTargetSeconds / 60,
      elapsedSeconds / 60,
      progressPercent
    );
  }, [totalTargetSeconds, elapsedSeconds, progressPercent]);

  // ── TIMER LOGIC ──
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

  // ── PDF LOADING ──
  useEffect(() => {
    const loadPdf = async () => {
      try {
        const data = await pdfStorage.getFile(book.id);
        if (data && data.byteLength > 0) {
          const blob = new Blob([data], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          setPdfUrl(url);

          if (typeof pdfjsLib !== 'undefined') {
            const pdf = await pdfjsLib.getDocument({ data }).promise;
            pdfDocRef.current = pdf;
            setTotalPages(pdf.numPages);
            renderPage(pdf, book.lastPage || 1);
          }
        }
      } catch (e) {
        console.warn('Failed to load PDF for deep session:', e);
      }
    };
    loadPdf();

    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [book.id]);

  const renderPage = async (pdf: any, pageNum: number) => {
    if (!pdf || !canvasRef.current) return;
    try {
      const page = await pdf.getPage(Math.min(pageNum, pdf.numPages));
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const viewport = page.getViewport({ scale: window.devicePixelRatio * 1.2 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = '100%';
      canvas.style.height = 'auto';

      await page.render({ canvasContext: ctx, viewport }).promise;
      setCurrentPage(pageNum);
    } catch (e) {
      console.warn('Page render failed:', e);
    }
  };

  const goToPage = (delta: number) => {
    const newPage = Math.max(1, Math.min(totalPages, currentPage + delta));
    if (pdfDocRef.current) renderPage(pdfDocRef.current, newPage);
  };

  // ── BACK BUTTON PROTECTION ──
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // ── COMPLETE SESSION ──
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

  // ── TIME COMPLETED SCREEN ──
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
            {isRTL ? `${Math.round(elapsedSeconds / 60)} دقيقة من أصل ${Math.round(totalTargetSeconds / 60)} دقيقة (100%)` : `${Math.round(elapsedSeconds / 60)} of ${Math.round(totalTargetSeconds / 60)} minutes (100%)`}
          </p>

          {/* Extend or Finish */}
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

        {/* Extend Menu */}
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

  // ── MAIN SESSION SCREEN ──
  return (
    <MotionDiv
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`fixed inset-0 z-[15000] bg-black flex flex-col ${fontClass}`}
    >
      {/* Top Bar — Timer + Progress */}
      <div className="shrink-0 px-4 py-3 bg-black/90 backdrop-blur-xl border-b border-white/5 z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Lock size={12} className="text-red-600" />
            <span className="text-[8px] font-black uppercase tracking-widest text-red-600">
              {t.deepSessionTitle}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Rewards Preview */}
            <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-full">
              <ShieldCheck size={10} className="text-amber-400" />
              <span className="text-[9px] font-black text-amber-400">{rewardsPreview.shields}</span>
            </div>
            <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-full">
              <Star size={10} className="text-amber-400 fill-amber-400" />
              <span className="text-[9px] font-black text-amber-400">{rewardsPreview.stars}</span>
            </div>
          </div>
        </div>

        {/* Countdown */}
        <div className="text-center mb-2">
          <p className="text-3xl font-black text-white tracking-[0.15em]" style={{ fontFamily: 'monospace' }}>
            {formatTime(hours, minutes, seconds)}
          </p>
          <p className="text-[8px] font-black uppercase tracking-widest text-white/30 mt-1">
            {t.deepSessionCountdown}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="relative">
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
            <MotionDiv
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5 }}
              className={`h-full rounded-full transition-colors duration-500 ${
                thresholdReached
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                  : 'bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_10px_rgba(255,0,0,0.5)]'
              }`}
            />
          </div>
          {/* 80% Threshold Marker */}
          <div
            className="absolute top-0 bottom-0 flex flex-col items-center"
            style={{ left: '80%' }}
          >
            <div className={`w-px h-full ${thresholdReached ? 'bg-emerald-500' : 'bg-amber-500/50'}`} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[7px] font-black uppercase text-white/20">
              {Math.round(progressPercent)}%
            </span>
            <span className={`text-[7px] font-black uppercase tracking-wider ${thresholdReached ? 'text-emerald-500' : 'text-amber-500/50'}`}>
              {thresholdReached ? t.deepSessionThresholdReached : t.deepSessionThreshold}
            </span>
          </div>
        </div>
      </div>

      {/* PDF Reader Area */}
      <div className="flex-1 overflow-y-auto bg-black relative" onClick={() => goToPage(1)}>
        {pdfUrl ? (
          <div className="flex flex-col items-center py-2">
            <canvas ref={canvasRef} className="max-w-full" />
            {/* Page Navigation */}
            <div className="flex items-center gap-4 py-3 text-white/40">
              <button
                onClick={(e) => { e.stopPropagation(); goToPage(-1); }}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-all active:scale-90"
                disabled={currentPage <= 1}
              >
                <ChevronRight size={16} className={isRTL ? '' : 'rotate-180'} />
              </button>
              <span className="text-[10px] font-black uppercase tracking-wider">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); goToPage(1); }}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-all active:scale-90"
                disabled={currentPage >= totalPages}
              >
                <ChevronRight size={16} className={isRTL ? 'rotate-180' : ''} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <BookOpen size={48} className="text-white/10 mx-auto" />
              <p className="text-xs font-bold text-white/20 uppercase tracking-widest">{book.title}</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Bar — Force End */}
      <div className="shrink-0 px-4 py-3 bg-black/90 backdrop-blur-xl border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-red-600" />
          <span className="text-[9px] font-black text-white/50 uppercase tracking-wider truncate max-w-[180px]">
            {book.title}
          </span>
        </div>

        <button
          onClick={() => setShowForceEndConfirm(true)}
          className="px-4 py-2 rounded-xl bg-red-600/10 border border-red-600/20 text-red-500 text-[9px] font-black uppercase tracking-wider hover:bg-red-600/30 transition-all active:scale-95"
        >
          {t.deepSessionForceEnd}
        </button>
      </div>

      {/* Force End Confirmation Modal */}
      <AnimatePresence>
        {showForceEndConfirm && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[16000] flex items-center justify-center bg-black/80 backdrop-blur-lg"
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
    </MotionDiv>
  );
};

export default DeepSessionTimer;
