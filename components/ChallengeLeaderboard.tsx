// ══════════════════════════════════════════════════════════════
// CHALLENGE LEADERBOARD — Full-Screen Centered Overlay
// Professional glassmorphism leaderboard inside the Reader
// ══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Clock, BookOpen, X,
  Loader2, LogOut, Star, Users, Target, Flame
} from 'lucide-react';
import type { Language } from '../types';
import { challengeService } from '../services/challengeService';
import type { ChallengeParticipant } from '../types/challenge';

const MotionDiv = motion.div as any;

// Country flag emojis
const FLAG_EMOJIS: Record<string, string> = {
  SA: '🇸🇦', EG: '🇪🇬', MA: '🇲🇦', DZ: '🇩🇿', AE: '🇦🇪', IQ: '🇮🇶', JO: '🇯🇴',
  SY: '🇸🇾', LB: '🇱🇧', TN: '🇹🇳', LY: '🇱🇾', SD: '🇸🇩', OM: '🇴🇲', QA: '🇶🇦',
  BH: '🇧🇭', KW: '🇰🇼', YE: '🇾🇪', PS: '🇵🇸', MR: '🇲🇷', TR: '🇹🇷', PK: '🇵🇰',
  MY: '🇲🇾', ID: '🇮🇩', US: '🇺🇸', GB: '🇬🇧', FR: '🇫🇷', DE: '🇩🇪', CA: '🇨🇦',
  AU: '🇦🇺', OTHER: '🌍',
};

const RANK_MEDALS = ['🥇', '🥈', '🥉'];
const RANK_COLORS = ['#f59e0b', '#94a3b8', '#cd7f32'];

interface Props {
  bookId: string;
  lang: Language;
  isOpen: boolean;
  onToggle: () => void;
}

export default function ChallengeLeaderboard({ bookId, lang, isOpen, onToggle }: Props) {
  const isRTL = lang === 'ar';
  const [participants, setParticipants] = useState<ChallengeParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const refreshTimerRef = useRef<number | null>(null);

  const challenge = challengeService.getChallengeForBook(bookId);

  const fetchData = useCallback(async () => {
    if (!challenge) return;
    setIsLoading(true);
    try {
      const data = await challengeService.fetchLeaderboard(bookId);
      setParticipants(data);
    } catch {
      if (challenge) setParticipants(challenge.participants || []);
    }
    setIsLoading(false);
  }, [bookId, challenge]);

  // Auto-refresh every 60 seconds when panel is open
  useEffect(() => {
    if (!isOpen || !challenge) return;
    fetchData();
    refreshTimerRef.current = window.setInterval(fetchData, 60000);
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [isOpen, fetchData, challenge]);

  const handleLeave = useCallback(async () => {
    const msg = isRTL
      ? 'هل أنت متأكد من مغادرة هذه المنافسة؟'
      : 'Are you sure you want to leave this challenge?';
    if (!window.confirm(msg)) return;
    setIsLeaving(true);
    await challengeService.leaveChallenge(bookId);
    setIsLeaving(false);
    setParticipants([]);
    onToggle();
  }, [bookId, isRTL, onToggle]);

  if (!challenge) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <MotionDiv
          key="leaderboard-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {/* Backdrop — click to close */}
          <div
            className="absolute inset-0 bg-black/85 backdrop-blur-xl"
            onClick={onToggle}
          />

          {/* Modal Card */}
          <MotionDiv
            initial={{ scale: 0.88, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.88, y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="relative w-full max-w-[420px] max-h-[85vh] flex flex-col bg-gradient-to-b from-[#0f1a0f] to-[#060c06] border border-amber-600/25 rounded-[2rem] shadow-[0_0_80px_rgba(245,158,11,0.12),0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden"
          >
            {/* ═══ HEADER ═══ */}
            <div className="relative px-5 pt-6 pb-4 border-b border-white/5">
              {/* Ambient glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-amber-500/10 blur-[60px] rounded-full pointer-events-none" />

              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/30 to-amber-700/20 border border-amber-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                    <Trophy size={20} className="text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white uppercase tracking-tight">
                      {isRTL ? 'لوحة الصدارة' : 'Leaderboard'}
                    </h2>
                    <p className="text-[9px] font-bold text-amber-500/60 uppercase tracking-[0.2em] mt-0.5">
                      {challenge.bookTitle}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isLoading && <Loader2 size={14} className="text-amber-500 animate-spin" />}
                  <button
                    onClick={onToggle}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Stats bar */}
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-600/10 border border-amber-600/15">
                  <Users size={11} className="text-amber-500/70" />
                  <span className="text-[10px] font-black text-amber-500/80">
                    {participants.length} {isRTL ? 'متنافس' : 'competitors'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/5">
                  <Target size={11} className="text-white/30" />
                  <span className="text-[10px] font-black text-white/30">
                    {isRTL ? 'النقاط = دقائق + إنجاز%' : 'Score = mins + completion%'}
                  </span>
                </div>
              </div>
            </div>

            {/* ═══ PARTICIPANTS LIST ═══ */}
            <div className="flex-1 overflow-y-auto custom-scroll">
              {participants.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center">
                    <Users size={32} className="text-white/8" />
                  </div>
                  <div className="text-center px-6">
                    <p className="text-sm font-black text-white/20 uppercase tracking-wider mb-1">
                      {isRTL ? 'لا يوجد متنافسون بعد' : 'No competitors yet'}
                    </p>
                    <p className="text-[10px] font-bold text-white/10">
                      {isRTL ? 'شارك الرمز السري مع أصدقائك للبدء' : 'Share the secret code with friends to start'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {participants.map((p, idx) => {
                    const isFirst = idx === 0;
                    const isTop3 = idx < 3;
                    const rankColor = RANK_COLORS[idx] || '#ffffff15';

                    return (
                      <div
                        key={p.userId}
                        className={`relative rounded-2xl overflow-hidden transition-all ${
                          isFirst
                            ? 'bg-gradient-to-r from-amber-600/15 via-amber-600/10 to-transparent border border-amber-500/25 shadow-[0_0_30px_rgba(245,158,11,0.08)]'
                            : isTop3
                            ? 'bg-white/[0.03] border border-white/8'
                            : 'bg-white/[0.015] border border-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3 px-4 py-3.5">
                          {/* Rank Badge */}
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isTop3 ? 'bg-black/30' : 'bg-white/[0.03]'
                          }`} style={isTop3 ? { border: `1.5px solid ${rankColor}40` } : {}}>
                            {isTop3 ? (
                              <span className="text-xl leading-none">{RANK_MEDALS[idx]}</span>
                            ) : (
                              <span className="text-xs font-black text-white/25">
                                #{idx + 1}
                              </span>
                            )}
                          </div>

                          {/* Name + Country + Stats */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-sm font-black text-white truncate">
                                {p.name}
                              </span>
                              <span className="text-sm shrink-0">
                                {FLAG_EMOJIS[p.country] || '🌍'}
                              </span>
                              {isFirst && (
                                <Flame size={12} className="text-amber-500 shrink-0 animate-pulse" />
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              {/* Reading Time */}
                              <div className="flex items-center gap-1">
                                <Clock size={10} className="text-white/20" />
                                <span className="text-[10px] font-bold text-white/35">
                                  {p.readingMinutes} {isRTL ? 'دقيقة' : 'min'}
                                </span>
                              </div>
                              {/* Completion */}
                              <div className="flex items-center gap-1">
                                <BookOpen size={10} className="text-white/20" />
                                <span className="text-[10px] font-bold text-white/35">
                                  {p.percentComplete}%
                                </span>
                              </div>
                              {/* Stars */}
                              {p.stars > 0 && (
                                <div className="flex items-center gap-0.5">
                                  <Star size={10} className="text-amber-500 fill-amber-500" />
                                  <span className="text-[10px] font-bold text-amber-500/60">
                                    {p.stars}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Score + Progress */}
                          <div className="shrink-0 flex flex-col items-center gap-1.5 min-w-[52px]">
                            <div className={`text-lg font-black ${isFirst ? 'text-amber-400' : 'text-white/50'}`}>
                              {p.score}
                            </div>
                            <span className="text-[7px] font-bold text-white/15 uppercase tracking-widest">
                              {isRTL ? 'نقطة' : 'pts'}
                            </span>
                          </div>
                        </div>

                        {/* Progress bar at bottom of card */}
                        <div className="h-1 bg-white/[0.02]">
                          <div
                            className="h-full transition-all duration-1000 ease-out"
                            style={{
                              width: `${Math.min(100, p.percentComplete)}%`,
                              background: isFirst
                                ? 'linear-gradient(90deg, #f59e0b, #f59e0b88)'
                                : isTop3
                                ? `linear-gradient(90deg, ${rankColor}88, ${rankColor}33)`
                                : 'linear-gradient(90deg, #ffffff15, #ffffff08)',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ═══ FOOTER ═══ */}
            <div className="px-5 py-4 border-t border-white/5 bg-black/30">
              <div className="flex items-center justify-between">
                {/* PIN display */}
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-black text-white/15 uppercase tracking-widest">
                    {isRTL ? 'رمز المنافسة:' : 'Code:'}
                  </span>
                  <span className="text-[10px] font-mono font-black text-amber-500/50 tracking-[0.2em] select-all">
                    {challenge.inviteToken || challenge.pin}
                  </span>
                </div>

                {/* Leave button */}
                <button
                  onClick={handleLeave}
                  disabled={isLeaving}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/8 border border-red-600/15 text-red-400/80 hover:bg-red-600/20 hover:text-red-400 transition-all active:scale-95"
                >
                  {isLeaving ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <LogOut size={12} />
                  )}
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    {isRTL ? 'مغادرة' : 'Leave'}
                  </span>
                </button>
              </div>
            </div>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}
