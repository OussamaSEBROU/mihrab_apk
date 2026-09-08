import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, BookOpen, RefreshCw, Lock, Globe, User, UserPlus, Link2, Loader2, X, AlertCircle } from 'lucide-react';
import { ReadingClub, ClubUserProfile } from '../../types/readingClub';

const MotionDiv = motion.div as any;

interface ClubListProps {
  lang: 'ar' | 'en';
  clubs: ReadingClub[];
  userProfile: ClubUserProfile;
  onCreateClub: () => void;
  onSelectClub: (club: ReadingClub) => void;
  onRefresh?: () => void;
  loading?: boolean;
  onJoinWithToken?: (token: string) => void;
}

export const ClubList: React.FC<ClubListProps> = ({ 
  lang, 
  clubs, 
  userProfile, 
  onCreateClub, 
  onSelectClub, 
  onRefresh,
  loading = false,
  onJoinWithToken
}) => {
  const isRTL = lang === 'ar';
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteInput, setInviteInput] = useState('');
  const [joinError, setJoinError] = useState('');

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case 'private': return <Lock className="w-4 h-4" />;
      case 'public': return <Globe className="w-4 h-4" />;
      case 'personal': return <User className="w-4 h-4" />;
      default: return <Lock className="w-4 h-4" />;
    }
  };

  const getRoleBadge = (role: string) => {
    const roleColors: Record<string, string> = {
      owner: 'bg-red-900/50 text-red-400 border-red-500/30',
      full_admin: 'bg-yellow-900/50 text-yellow-400 border-yellow-500/30',
      content_admin: 'bg-yellow-900/40 text-yellow-300 border-yellow-500/20',
      member_admin: 'bg-amber-900/40 text-amber-300 border-amber-500/20',
      discussion_mod: 'bg-orange-900/40 text-orange-300 border-orange-500/20',
      admin: 'bg-yellow-900/50 text-yellow-400 border-yellow-500/30',
      member: 'bg-gray-800 text-gray-300 border-gray-600',
      readonly: 'bg-gray-800/50 text-gray-400 border-gray-700',
    };
    const roleLabels: Record<string, string> = {
      owner: lang === 'ar' ? 'مالك' : 'OWNER',
      full_admin: lang === 'ar' ? 'مشرف أول' : 'ADMIN',
      content_admin: lang === 'ar' ? 'مشرف محتوى' : 'CONTENT MOD',
      member_admin: lang === 'ar' ? 'مشرف أعضاء' : 'MEMBER MOD',
      discussion_mod: lang === 'ar' ? 'مشرف نقاش' : 'DISCUSSION MOD',
      admin: lang === 'ar' ? 'مشرف' : 'ADMIN',
      member: lang === 'ar' ? 'عضو' : 'MEMBER',
      readonly: lang === 'ar' ? 'قراءة فقط' : 'READ ONLY',
    };
    const style = roleColors[role] || roleColors.member;
    const label = roleLabels[role] || roleLabels.member;
    
    return (
      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${style}`}>
        {label}
      </span>
    );
  };

  /**
   * Extract token from various invite link/code formats:
   * - mihrab://club/invite/TOKEN
   * - https://example.com/join/TOKEN
   * - /join/TOKEN
   * - Just the TOKEN itself
   */
  const extractToken = (input: string): string | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Try to extract from mihrab://club/invite/TOKEN
    const mihrabMatch = trimmed.match(/mihrab:\/\/club\/invite\/([a-zA-Z0-9_-]+)/);
    if (mihrabMatch) return mihrabMatch[1];

    // Try to extract from https://...com/join/TOKEN
    const urlMatch = trimmed.match(/\/join\/([a-zA-Z0-9_-]+)/);
    if (urlMatch) return urlMatch[1];

    // If it looks like a raw token (alphanumeric, dashes, underscores, 6+ chars)
    if (/^[a-zA-Z0-9_-]{6,}$/.test(trimmed)) return trimmed;

    return null;
  };

  const handleJoinSubmit = () => {
    setJoinError('');
    const token = extractToken(inviteInput);
    if (!token) {
      setJoinError(isRTL ? 'الرابط أو الرمز غير صالح. الصق رابط الدعوة أو رمز الانضمام.' : 'Invalid link or code. Paste the invite link or join code.');
      return;
    }
    if (onJoinWithToken) {
      onJoinWithToken(token);
    }
    setShowJoinModal(false);
    setInviteInput('');
    setJoinError('');
  };

  return (
    <div className="w-full h-full bg-[#000a00] text-white flex flex-col relative" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="p-4 flex items-center justify-between border-b border-white/5">
        <div>
          <h1 className="text-xl font-black uppercase tracking-widest text-red-500">
            {lang === 'ar' ? 'أندية القراءة' : 'Reading Clubs'}
          </h1>
          <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">
            {userProfile.nickname} • {lang === 'ar' ? 'الملف الشخصي' : 'Profile'}
          </p>
        </div>
        {onRefresh && (
          <button 
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-full hover:bg-white/5 transition-colors text-gray-400 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {loading && clubs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 space-y-4 text-gray-500">
            <RefreshCw className="w-8 h-8 animate-spin text-red-900" />
            <span className="font-bold uppercase tracking-widest text-sm">
              {lang === 'ar' ? 'جاري التحميل...' : 'LOADING...'}
            </span>
          </div>
        ) : clubs.length === 0 ? (
          /* ══════════════════════════════════════════════════ */
          /* Empty State — Two Buttons: Create OR Join        */
          /* ══════════════════════════════════════════════════ */
          <div className="flex flex-col items-center justify-center text-center p-8 mt-10 border border-white/10 rounded-xl bg-black/30">
            <Users className="w-12 h-12 text-gray-600 mb-4" />
            <h3 className="text-lg font-bold mb-2">
              {lang === 'ar' ? 'لا توجد أندية' : 'No Clubs Yet'}
            </h3>
            <p className="text-gray-400 text-sm mb-6 max-w-xs">
              {lang === 'ar' 
                ? 'أنشئ نادي القراءة الخاص بك أو انضم إلى نادٍ موجود من خلال رابط دعوة.' 
                : 'Create your own reading club or join an existing one via invite link.'}
            </p>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={onCreateClub}
                className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span>{lang === 'ar' ? 'إنشاء نادي' : 'CREATE CLUB'}</span>
              </button>
              <button
                onClick={() => setShowJoinModal(true)}
                className="w-full px-6 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-red-500/50 rounded-lg font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
              >
                <UserPlus className="w-5 h-5 text-red-400" />
                <span>{lang === 'ar' ? 'الانضمام إلى نادي' : 'JOIN A CLUB'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence>
              {clubs.map((club, index) => (
                <MotionDiv
                  key={club._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onSelectClub(club)}
                  className="bg-black/40 border border-white/10 hover:border-red-500/50 rounded-xl p-4 cursor-pointer transition-all hover:bg-white/5 relative overflow-hidden group"
                >
                  <div className={`absolute top-0 ${isRTL ? 'right-0 w-1' : 'left-0 w-1'} h-full bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity`} />
                  
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-white group-hover:text-red-400 transition-colors">
                      {club.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      {getRoleBadge(club.myRole || 'member')}
                      <span className="text-gray-500" title={club.privacy}>
                        {getPrivacyIcon(club.privacy || 'private')}
                      </span>
                    </div>
                  </div>
                  
                  {club.description && (
                    <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                      {club.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-gray-500">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{club.memberCount || 1} {lang === 'ar' ? 'أعضاء' : 'MEMBERS'}</span>
                    </div>
                    {club.currentBookTitle && (
                      <div className="flex items-center gap-1 max-w-[50%]">
                        <BookOpen className="w-4 h-4 shrink-0" />
                        <span className="truncate">{club.currentBookTitle}</span>
                      </div>
                    )}
                  </div>
                </MotionDiv>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* Floating Action Buttons — Create + Join           */}
      {/* ══════════════════════════════════════════════════ */}
      {clubs.length > 0 && (
        <div className={`absolute bottom-6 ${isRTL ? 'left-6' : 'right-6'} flex flex-col gap-3`}>
          {/* Join Club FAB */}
          <button
            onClick={() => setShowJoinModal(true)}
            className="w-14 h-14 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
            title={isRTL ? 'الانضمام إلى نادي' : 'Join a Club'}
          >
            <UserPlus className="w-6 h-6 text-red-400" />
          </button>
          {/* Create Club FAB */}
          <button
            onClick={onCreateClub}
            className="w-14 h-14 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-900/50 transition-transform hover:scale-105 active:scale-95"
            title={isRTL ? 'إنشاء نادي' : 'Create Club'}
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* Join Modal — paste invite link or code             */}
      {/* ══════════════════════════════════════════════════ */}
      {showJoinModal && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
          <MotionDiv
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0b140b] border border-white/10 rounded-3xl p-6 w-full max-w-md"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black uppercase tracking-widest text-red-500 flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                {isRTL ? 'الانضمام إلى نادي' : 'Join a Club'}
              </h2>
              <button onClick={() => { setShowJoinModal(false); setInviteInput(''); setJoinError(''); }} className="text-gray-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* Instructions */}
            <p className="text-sm text-gray-400 mb-4">
              {isRTL 
                ? 'الصق رابط الدعوة أو رمز الانضمام الذي أرسله لك صاحب النادي.' 
                : 'Paste the invite link or join code sent to you by the club owner.'}
            </p>

            {/* Input */}
            <div className="relative mb-4">
              <div className="absolute top-1/2 -translate-y-1/2 start-3 text-gray-500">
                <Link2 size={18} />
              </div>
              <input
                type="text"
                value={inviteInput}
                onChange={(e) => { setInviteInput(e.target.value); setJoinError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleJoinSubmit(); }}
                className="w-full bg-black/50 border border-white/10 rounded-xl py-4 text-white text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all placeholder:text-gray-600"
                style={{ paddingInlineStart: '2.5rem', paddingInlineEnd: '1rem' }}
                placeholder={isRTL ? 'الصق الرابط أو الرمز هنا...' : 'Paste link or code here...'}
                autoFocus
                dir="ltr"
              />
            </div>

            {/* Error */}
            {joinError && (
              <div className="bg-red-900/20 border border-red-600/50 rounded-xl p-3 mb-4 flex items-center gap-2">
                <AlertCircle className="text-red-500 shrink-0" size={16} />
                <p className="text-red-200 text-xs">{joinError}</p>
              </div>
            )}

            {/* Examples hint */}
            <div className="bg-black/30 border border-white/5 rounded-xl p-3 mb-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                {isRTL ? 'أمثلة مقبولة:' : 'ACCEPTED FORMATS:'}
              </p>
              <div className="space-y-1 text-[10px] text-gray-600 font-mono" dir="ltr">
                <p>mihrab://club/invite/abc123</p>
                <p>https://example.com/join/abc123</p>
                <p>abc123</p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowJoinModal(false); setInviteInput(''); setJoinError(''); }}
                className="flex-1 py-3 bg-white/5 text-gray-400 rounded-xl font-black uppercase text-xs"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleJoinSubmit}
                disabled={!inviteInput.trim()}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
              >
                <UserPlus size={14} />
                {isRTL ? 'انضمام' : 'JOIN'}
              </button>
            </div>
          </MotionDiv>
        </div>
      )}
    </div>
  );
};

export default ClubList;
