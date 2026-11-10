// ══════════════════════════════════════════════════════════════
// CHALLENGE LEADERBOARD — In-Reader Dropdown Panel
// Shows live competition standings for the current book
// ══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Clock, BookOpen, ChevronDown, ChevronUp,
  Loader2, LogOut, Star, Users, Percent
} from 'lucide-react';
import type { Language } from '../types';
import { challengeService } from '../services/challengeService';
import type { ChallengeParticipant } from '../types/challenge';
import { translations } from '../i18n/translations';

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

interface Props {
  bookId: string;
  lang: Language;
  isOpen: boolean;
  onToggle: () => void;
}

export default function ChallengeLeaderboard({ bookId, lang, isOpen, onToggle }: Props) {
  const isRTL = lang === 'ar';
  const t = (translations as any)[lang];
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
      // Use cached data
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
    onToggle(); // close panel
  }, [bookId, isRTL, onToggle]);

  // No challenge active for this book
  if (!challenge) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <MotionDiv
          key="leaderboard-panel"
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-[1200] w-[92vw] max-w-md"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <div className="bg-black/90 backdrop-blur-2xl border border-amber-600/20 rounded-2xl shadow-[0_0_60px_rgba(245,158,11,0.15)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-600/20">
                  <Trophy size={14} className="text-amber-500" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">
                    {isRTL ? 'لوحة الصدارة' : 'Leaderboard'}
                  </h3>
                  <p className="text-[7px] font-bold text-amber-500/50 uppercase tracking-widest">
                    {participants.length} {isRTL ? 'متنافسين' : 'competitors'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isLoading && <Loader2 size={12} className="text-amber-500 animate-spin" />}
                <button
                  onClick={onToggle}
                  className="p-1.5 rounded-full bg-white/5 text-white/40 hover:text-white transition-all"
                >
                  <ChevronUp size={14} />
                </button>
              </div>
            </div>

            {/* Participants List */}
            <div className="max-h-[50vh] overflow-y-auto custom-scroll">
              {participants.length === 0 ? (
                <div className="py-10 text-center">
                  <Users size={24} className="mx-auto text-white/10 mb-2" />
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                    {isRTL ? 'لا يوجد متنافسون بعد' : 'No competitors yet'}
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {participants.map((p, idx) => (
                    <div
                      key={p.userId}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                        idx === 0
                          ? 'bg-amber-600/15 border border-amber-600/20'
                          : idx === 1
                          ? 'bg-white/[0.04] border border-white/5'
                          : idx === 2
                          ? 'bg-white/[0.03] border border-white/5'
                          : 'bg-white/[0.02] border border-transparent'
                      }`}
                    >
                      {/* Rank */}
                      <div className="w-8 h-8 flex items-center justify-center shrink-0">
                        {idx < 3 ? (
                          <span className="text-lg">{RANK_MEDALS[idx]}</span>
                        ) : (
                          <span className="text-[10px] font-black text-white/30">
                            {idx + 1}
                          </span>
                        )}
                      </div>

                      {/* Name + Country */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-white truncate">
                            {p.name}
                          </span>
                          <span className="text-xs shrink-0">
                            {FLAG_EMOJIS[p.country] || '🌍'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          {/* Reading Time */}
                          <div className="flex items-center gap-1">
                            <Clock size={8} className="text-white/20" />
                            <span className="text-[8px] font-bold text-white/30">
                              {p.readingMinutes}{isRTL ? 'د' : 'm'}
                            </span>
                          </div>
                          {/* Completion */}
                          <div className="flex items-center gap-1">
                            <BookOpen size={8} className="text-white/20" />
                            <span className="text-[8px] font-bold text-white/30">
                              {p.percentComplete}%
                            </span>
                          </div>
                          {/* Stars */}
                          {p.stars > 0 && (
                            <div className="flex items-center gap-0.5">
                              <Star size={8} className="text-amber-500 fill-amber-500" />
                              <span className="text-[8px] font-bold text-amber-500/60">
                                {p.stars}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-14 shrink-0">
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${Math.min(100, p.percentComplete)}%`,
                              backgroundColor: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : idx === 2 ? '#a16207' : '#ffffff22',
                            }}
                          />
                        </div>
                        <p className="text-[7px] font-bold text-white/20 text-center mt-0.5">
                          {p.score} {isRTL ? 'نقطة' : 'pts'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer — Score info + Leave */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/5 bg-white/[0.02]">
              <p className="text-[7px] font-bold text-white/15 uppercase tracking-wider">
                {isRTL ? 'النقاط = دقائق القراءة + نسبة الإنجاز' : 'Score = Reading mins + Completion %'}
              </p>
              <button
                onClick={handleLeave}
                disabled={isLeaving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/10 border border-red-600/20 text-red-400 hover:bg-red-600/20 transition-all text-[8px] font-black uppercase tracking-wider"
              >
                {isLeaving ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : (
                  <LogOut size={10} />
                )}
                {isRTL ? 'مغادرة' : 'Leave'}
              </button>
            </div>
          </div>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}
