// ══════════════════════════════════════════════════════════════
// CHALLENGE MODAL — Create / Join a Book Challenge
// ══════════════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, X, Plus, LogIn, Copy, Check, Loader2,
  Globe, User, BookOpen, Share2, Flag
} from 'lucide-react';
import type { Language, Book } from '../types';
import { challengeService } from '../services/challengeService';
import type { ChallengeIdentity } from '../types/challenge';

const MotionDiv = motion.div as any;

// Country list (Arabic + English)
const COUNTRIES = [
  { code: 'SA', ar: 'السعودية', en: 'Saudi Arabia' },
  { code: 'EG', ar: 'مصر', en: 'Egypt' },
  { code: 'MA', ar: 'المغرب', en: 'Morocco' },
  { code: 'DZ', ar: 'الجزائر', en: 'Algeria' },
  { code: 'AE', ar: 'الإمارات', en: 'UAE' },
  { code: 'IQ', ar: 'العراق', en: 'Iraq' },
  { code: 'JO', ar: 'الأردن', en: 'Jordan' },
  { code: 'SY', ar: 'سوريا', en: 'Syria' },
  { code: 'LB', ar: 'لبنان', en: 'Lebanon' },
  { code: 'TN', ar: 'تونس', en: 'Tunisia' },
  { code: 'LY', ar: 'ليبيا', en: 'Libya' },
  { code: 'SD', ar: 'السودان', en: 'Sudan' },
  { code: 'OM', ar: 'عُمان', en: 'Oman' },
  { code: 'QA', ar: 'قطر', en: 'Qatar' },
  { code: 'BH', ar: 'البحرين', en: 'Bahrain' },
  { code: 'KW', ar: 'الكويت', en: 'Kuwait' },
  { code: 'YE', ar: 'اليمن', en: 'Yemen' },
  { code: 'PS', ar: 'فلسطين', en: 'Palestine' },
  { code: 'MR', ar: 'موريتانيا', en: 'Mauritania' },
  { code: 'TR', ar: 'تركيا', en: 'Turkey' },
  { code: 'PK', ar: 'باكستان', en: 'Pakistan' },
  { code: 'MY', ar: 'ماليزيا', en: 'Malaysia' },
  { code: 'ID', ar: 'إندونيسيا', en: 'Indonesia' },
  { code: 'US', ar: 'أمريكا', en: 'United States' },
  { code: 'GB', ar: 'بريطانيا', en: 'United Kingdom' },
  { code: 'FR', ar: 'فرنسا', en: 'France' },
  { code: 'DE', ar: 'ألمانيا', en: 'Germany' },
  { code: 'CA', ar: 'كندا', en: 'Canada' },
  { code: 'AU', ar: 'أستراليا', en: 'Australia' },
  { code: 'OTHER', ar: 'أخرى', en: 'Other' },
];

const FLAG_EMOJIS: Record<string, string> = {
  SA: '🇸🇦', EG: '🇪🇬', MA: '🇲🇦', DZ: '🇩🇿', AE: '🇦🇪', IQ: '🇮🇶', JO: '🇯🇴',
  SY: '🇸🇾', LB: '🇱🇧', TN: '🇹🇳', LY: '🇱🇾', SD: '🇸🇩', OM: '🇴🇲', QA: '🇶🇦',
  BH: '🇧🇭', KW: '🇰🇼', YE: '🇾🇪', PS: '🇵🇸', MR: '🇲🇷', TR: '🇹🇷', PK: '🇵🇰',
  MY: '🇲🇾', ID: '🇮🇩', US: '🇺🇸', GB: '🇬🇧', FR: '🇫🇷', DE: '🇩🇪', CA: '🇨🇦',
  AU: '🇦🇺', OTHER: '🌍',
};

interface Props {
  lang: Language;
  book: Book;
  onClose: () => void;
  onChallengeReady: () => void;
}

export default function ChallengeModal({ lang, book, onClose, onChallengeReady }: Props) {
  const isRTL = lang === 'ar';
  const [mode, setMode] = useState<'choose' | 'create' | 'join' | 'success'>('choose');
  const [name, setName] = useState(() => challengeService.getIdentity()?.name || '');
  const [country, setCountry] = useState(() => challengeService.getIdentity()?.country || '');
  const [pin, setPin] = useState('');
  const [generatedPin, setGeneratedPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCreate = useCallback(async () => {
    if (!name.trim() || !country) return;
    setIsLoading(true);
    setError('');

    const identity: ChallengeIdentity = { name: name.trim(), country };
    const result = await challengeService.createChallenge(
      identity, book.id, book.title, book.author
    );

    setIsLoading(false);
    if (result.success && result.pin) {
      setGeneratedPin(result.challenge?.inviteToken || result.pin || '');
      setMode('success');
    } else {
      setError(result.error || (isRTL ? 'فشل إنشاء المنافسة' : 'Failed to create challenge'));
    }
  }, [name, country, book, isRTL]);

  const handleJoin = useCallback(async () => {
    if (!name.trim() || !country || !pin.trim()) return;
    setIsLoading(true);
    setError('');

    const identity: ChallengeIdentity = { name: name.trim(), country };
    const result = await challengeService.joinChallenge(identity, pin.trim(), book.id);

    setIsLoading(false);
    if (result.success) {
      onChallengeReady();
      onClose();
    } else {
      setError(result.error || (isRTL ? 'رمز المنافسة غير صحيح' : 'Invalid challenge code'));
    }
  }, [name, country, pin, book, isRTL, onClose, onChallengeReady]);

  const handleCopyPin = useCallback(() => {
    navigator.clipboard.writeText(generatedPin).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [generatedPin]);

  return (
    <MotionDiv
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[12000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <MotionDiv
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-gradient-to-br from-[#0d1a0d] to-[#050a05] border border-amber-600/30 rounded-[2rem] p-6 max-w-md w-full shadow-[0_0_60px_rgba(245,158,11,0.15)] max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-600/20 border border-amber-600/30">
              <Trophy size={20} className="text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">
                {isRTL ? 'منافسة الكتاب' : 'Book Challenge'}
              </h3>
              <p className="text-[8px] font-bold text-amber-500/60 uppercase tracking-widest">
                {book.title}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-white/5 text-white/40 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-600/10 border border-red-600/30 text-red-400 text-xs font-bold">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ─── CHOOSE MODE ─── */}
          {mode === 'choose' && (
            <MotionDiv key="choose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <button
                onClick={() => setMode('create')}
                className="w-full flex items-center gap-4 p-5 rounded-2xl bg-amber-600/10 border border-amber-600/20 hover:bg-amber-600/20 transition-all group"
              >
                <div className="p-3 rounded-xl bg-amber-600/20 group-hover:bg-amber-600/40">
                  <Plus size={22} className="text-amber-500" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-black uppercase tracking-widest text-white">
                    {isRTL ? 'إنشاء منافسة' : 'Create Challenge'}
                  </span>
                  <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">
                    {isRTL ? 'أنشئ منافسة وشاركها مع أصدقائك' : 'Start a challenge and share with friends'}
                  </span>
                </div>
              </button>

              <button
                onClick={() => setMode('join')}
                className="w-full flex items-center gap-4 p-5 rounded-2xl bg-emerald-600/10 border border-emerald-600/20 hover:bg-emerald-600/20 transition-all group"
              >
                <div className="p-3 rounded-xl bg-emerald-600/20 group-hover:bg-emerald-600/40">
                  <LogIn size={22} className="text-emerald-500" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-black uppercase tracking-widest text-white">
                    {isRTL ? 'الانضمام لمنافسة' : 'Join Challenge'}
                  </span>
                  <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">
                    {isRTL ? 'أدخل الرمز السري للانضمام' : 'Enter the secret code to join'}
                  </span>
                </div>
              </button>
            </MotionDiv>
          )}

          {/* ─── CREATE / JOIN FORM ─── */}
          {(mode === 'create' || mode === 'join') && (
            <MotionDiv key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              {/* Identity Section */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <User size={14} className="text-amber-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/50">
                    {isRTL ? 'هويتك في المنافسة' : 'Your Challenge Identity'}
                  </span>
                </div>

                {/* Name */}
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={isRTL ? 'اسمك الكامل' : 'Your full name'}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50 transition-all text-sm font-bold"
                  dir={isRTL ? 'rtl' : 'ltr'}
                />

                {/* Country */}
                <div className="relative">
                  <Globe size={14} className="absolute top-1/2 -translate-y-1/2 left-3 rtl:left-auto rtl:right-3 text-white/30" />
                  <select
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-10 py-3 text-white focus:outline-none focus:border-amber-500/50 transition-all text-sm font-bold appearance-none"
                    dir={isRTL ? 'rtl' : 'ltr'}
                  >
                    <option value="" className="bg-black">{isRTL ? 'اختر بلدك' : 'Select your country'}</option>
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.code} className="bg-black">
                        {FLAG_EMOJIS[c.code]} {isRTL ? c.ar : c.en}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* PIN Input (Join mode only) */}
              {mode === 'join' && (
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen size={14} className="text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/50">
                      {isRTL ? 'رمز المنافسة' : 'Challenge Code'}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    placeholder={isRTL ? 'أدخل الرمز السري' : 'Enter the secret code'}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 transition-all text-sm font-bold text-center tracking-[0.3em]"
                    dir="ltr"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setMode('choose'); setError(''); }}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-black uppercase text-xs hover:bg-white/10 transition-all"
                >
                  {isRTL ? 'رجوع' : 'Back'}
                </button>
                <button
                  onClick={mode === 'create' ? handleCreate : handleJoin}
                  disabled={isLoading || !name.trim() || !country || (mode === 'join' && !pin.trim())}
                  className={`flex-[2] px-4 py-3 rounded-xl text-white font-black uppercase text-xs shadow-lg transition-all disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95 ${
                    mode === 'create'
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                  }`}
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : (
                    mode === 'create' ? <Trophy size={16} /> : <LogIn size={16} />
                  )}
                  {isLoading
                    ? (isRTL ? 'جاري التحميل...' : 'Loading...')
                    : mode === 'create'
                      ? (isRTL ? 'إنشاء المنافسة' : 'Create Challenge')
                      : (isRTL ? 'انضمام' : 'Join')
                  }
                </button>
              </div>
            </MotionDiv>
          )}

          {/* ─── SUCCESS: Show PIN ─── */}
          {mode === 'success' && (
            <MotionDiv key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-5">
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-600/20 border border-amber-600/30 flex items-center justify-center">
                <Trophy size={32} className="text-amber-500" />
              </div>
              <div>
                <h4 className="text-xl font-black text-white uppercase tracking-tight mb-1">
                  {isRTL ? 'تم إنشاء المنافسة!' : 'Challenge Created!'}
                </h4>
                <p className="text-xs text-white/40 font-bold">
                  {isRTL ? 'شارك هذا الرمز مع أصدقائك للانضمام' : 'Share this code with friends to join'}
                </p>
              </div>

              {/* PIN Display */}
              <div className="bg-black/60 border border-amber-600/30 rounded-2xl p-5">
                <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] block mb-2">
                  {isRTL ? 'الرمز السري' : 'Secret Code'}
                </span>
                <div className="text-2xl font-black text-white tracking-[0.5em] font-mono select-all break-all leading-relaxed">
                  {generatedPin}
                </div>
              </div>

              {/* Copy & Share */}
              <div className="flex gap-3">
                <button
                  onClick={handleCopyPin}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-black uppercase text-xs hover:bg-white/10 transition-all"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  {copied ? (isRTL ? 'تم النسخ!' : 'Copied!') : (isRTL ? 'نسخ الرمز' : 'Copy Code')}
                </button>
              </div>

              <button
                onClick={() => { onChallengeReady(); onClose(); }}
                className="w-full px-4 py-4 rounded-xl bg-amber-600 text-white font-black uppercase text-xs hover:bg-amber-700 shadow-lg shadow-amber-600/30 transition-all active:scale-95"
              >
                {isRTL ? 'ابدأ القراءة والمنافسة' : 'Start Reading & Competing'}
              </button>
            </MotionDiv>
          )}
        </AnimatePresence>
      </MotionDiv>
    </MotionDiv>
  );
}
