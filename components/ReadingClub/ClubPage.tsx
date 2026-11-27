import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, MessageSquare, Users, Quote, Flag, Share2, Settings, BookOpen, Loader2, Copy, CheckCircle, LogOut } from 'lucide-react';
import { ReadingClub, ClubUserProfile, ClubView } from '../../types/readingClub';
import { clubInvitesAPI, clubMembersAPI } from '../../services/readingClubAPI';
import ConfirmDialog from './shared/ConfirmDialog';
import ClubBooksSection from './ClubBooksSection';
import { titleMatches, challengeService, parseChallengeDescription } from '../../services/challengeService';
import { clubInviteCode } from '../../services/clubInviteCode';

const MotionDiv = motion.div as any;

interface ClubPageProps {
  lang: 'ar' | 'en';
  club: ReadingClub;
  userProfile: ClubUserProfile;
  onBack: () => void;
  onNavigate: (view: ClubView, data?: any) => void;
  books?: any[];
  onOpenReader?: (book: any) => void;
  onClubLeft?: () => void;
}

export const ClubPage: React.FC<ClubPageProps> = ({ lang, club, userProfile, onBack, onNavigate, books, onOpenReader, onClubLeft }) => {
  const isRTL = lang === 'ar';
  
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(() => clubInviteCode.get(club._id, club));
  const [copied, setCopied] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Check all 7 roles for admin access
  const isOwner = club.myRole === 'owner' || club.ownerId === (userProfile.id || userProfile.serverUserId);
  const isOwnerOrAdmin = ['owner', 'full_admin', 'content_admin', 'member_admin', 'admin'].includes(club.myRole || '');

  const handleInvite = async () => {
    if (inviteToken) return;
    
    setGeneratingInvite(true);
    try {
      // رمز موحَّد لنفس النادي (نفس رمز إنشاء المنافسة)
      const token = await clubInviteCode.ensure(club._id, club);
      if (token) setInviteToken(token);
    } catch (err) {
      console.error('Failed to create invite:', err);
    } finally {
      setGeneratingInvite(false);
    }
  };

  const copyInvite = () => {
    if (inviteToken) {
      const url = `mihrab://club/invite/${inviteToken}`;
      const fallbackUrl = `${window.location.origin}/join/${inviteToken}`;
      navigator.clipboard.writeText(url).catch(() => {
        navigator.clipboard.writeText(fallbackUrl);
      }).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleLeave = async () => {
    setLeaving(true);
    try {
      const res = await clubMembersAPI.leaveGroup(club._id);
      if (res.ok) {
        onBack();
        onClubLeft?.();
      }
    } catch (err) {
      console.error('Failed to leave club:', err);
    } finally {
      setLeaving(false);
      setShowLeaveConfirm(false);
    }
  };

  const parsedDesc = parseChallengeDescription(club.description);
  const curTitle = club.currentBookTitle || parsedDesc?.title || '';
  const curAuthor = club.currentBookTitle ? club.currentBookAuthor : (club.currentBookAuthor || parsedDesc?.author || '');
  const [bookMissing, setBookMissing] = useState(false);
  const handleOpenBook = () => {
    if (!books || !onOpenReader) return;
    // نطابق بالمعرّف ثم بالعنوان (معرّف الملف يختلف من جهاز لآخر)
    const curEntry = challengeService.getCachedClubBooks(club._id, club).find(e => curTitle && titleMatches(e.title, curTitle));
    const byTitle = books.filter(b => curTitle && titleMatches(b.title, curTitle));
    const book =
      books.find(b => club.currentBookId && (b.id === club.currentBookId || b._id === club.currentBookId)) ||
      // لمدخل له بصمة: نطابق بها فقط؛ وإلا بالاسم إن كان مرشّحاً وحيداً (لا نخمّن بين كتابين متشابهين)
      (curEntry?.hash ? books.find(b => b.contentHash === curEntry.hash) : (byTitle.length === 1 ? byTitle[0] : undefined));
    if (book) { setBookMissing(false); onOpenReader(book); }
    else { setBookMissing(true); setTimeout(() => setBookMissing(false), 3500); }
  };

  return (
    <div className="w-full h-full bg-[#000a00] text-white flex flex-col relative" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="p-4 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button 
            onClick={onBack}
            className="p-2 rounded-full hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className={`w-6 h-6 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-red-500" style={{ fontSize: 15, lineHeight: 1.35, letterSpacing: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}>
              {club.name}
            </h1>
            <p className="text-xs text-gray-400 uppercase tracking-wider">
              {club.memberCount || 1} {lang === 'ar' ? 'أعضاء' : 'MEMBERS'}
            </p>
          </div>
        </div>
        
        {isOwnerOrAdmin && (
          <button 
            onClick={() => onNavigate('settings')}
            className="p-2 rounded-full hover:bg-white/5 transition-colors text-gray-400 hover:text-white"
          >
            <Settings className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Header Section */}
        <MotionDiv
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-6"
        >
          <div className="w-20 h-20 bg-red-900/20 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="font-black mb-2 px-2" style={{ fontSize: 20, lineHeight: 1.4, letterSpacing: 0, wordBreak: 'break-word' }}>{club.name}</h2>
          {club.description && (
            <p className="text-sm text-gray-400 max-w-sm mx-auto">{club.description}</p>
          )}
        </MotionDiv>

        {/* Current Book */}
        {curTitle && (club.bookVisibleToMembers !== false || !!parsedDesc) && (
          <MotionDiv
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col gap-2"
          >
            <div
              onClick={handleOpenBook}
              role={onOpenReader ? 'button' : undefined}
              className={`bg-black/40 border border-white/10 rounded-xl p-4 flex items-center gap-4 ${onOpenReader ? 'cursor-pointer active:bg-white/5' : ''}`}
            >
              <div className="w-12 h-16 bg-red-900/30 rounded flex items-center justify-center border border-red-500/20 shrink-0">
                <BookOpen className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">
                  {lang === 'ar' ? 'نقرأ الآن' : 'CURRENTLY READING'}
                </p>
                <h3 className="font-bold text-sm line-clamp-2">{curTitle}</h3>
                {curAuthor && (
                  <p className="text-xs text-gray-500 mt-1">{curAuthor}</p>
                )}
              </div>
              {books && onOpenReader && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleOpenBook(); }}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-widest rounded-lg transition-colors"
                >
                  {lang === 'ar' ? 'افتح' : 'Open'}
                </button>
              )}
            </div>
            {bookMissing && (
              <div className="text-[11px] font-black text-amber-300 text-center">
                {lang === 'ar' ? 'هذا الكتاب غير موجود في مكتبتك — أضفه أولاً من المحراب' : 'This book is not in your library yet'}
              </div>
            )}
            {club.bookVisibleToMembers && (
              <div className="text-[10px] text-green-500/80 flex items-center justify-center gap-1 bg-green-500/10 py-1 px-3 rounded-full mx-auto w-max border border-green-500/20">
                <CheckCircle className="w-3 h-3" />
                {lang === 'ar' ? 'الكتاب متاح للأعضاء' : 'Book is accessible to members'}
              </div>
            )}
          </MotionDiv>
        )}

        {/* Challenge books (multi-book competitions inside the club) */}
        {club.privacy !== 'personal' && (
          <ClubBooksSection lang={lang} club={club} canManage={isOwner || isOwnerOrAdmin} books={books} onOpenBook={onOpenReader} />
        )}

        {/* Invite Section (Admins/Owners) */}
        {isOwnerOrAdmin && club.privacy !== 'personal' && (
          <MotionDiv
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-red-900/10 border border-red-900/30 rounded-xl p-4"
          >
            {!inviteToken ? (
              <button
                onClick={handleInvite}
                disabled={generatingInvite}
                className="w-full flex items-center justify-center gap-2 py-2 text-red-400 hover:text-red-300 font-bold uppercase text-sm tracking-wider"
              >
                {generatingInvite ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'إنشاء رابط دعوة' : 'Generate Invite Link'}</span>
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center justify-between bg-black/50 rounded-lg p-3 border border-white/5">
                <div className="flex flex-col flex-1 overflow-hidden mr-2">
                  <span className="text-xs font-mono text-gray-300 truncate">
                    mihrab://club/invite/{inviteToken}
                  </span>
                  <span className="text-[10px] font-mono text-gray-500 truncate mt-1">
                    {window.location.origin}/join/{inviteToken}
                  </span>
                </div>
                <button
                  onClick={copyInvite}
                  className="p-2 hover:bg-white/10 rounded transition-colors text-white shrink-0"
                >
                  {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            )}
          </MotionDiv>
        )}

        {/* Navigation Grid */}
        <div className="grid grid-cols-2 gap-4">
          <MotionDiv
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            onClick={() => onNavigate('discussion')}
            className="bg-black/40 border border-white/10 hover:border-red-500/50 rounded-xl p-5 cursor-pointer flex flex-col items-center justify-center text-center group transition-all hover:bg-white/5"
          >
            <MessageSquare className="w-8 h-8 text-gray-400 group-hover:text-red-400 mb-3 transition-colors" />
            <span className="font-black uppercase tracking-widest text-xs group-hover:text-red-400 transition-colors">
              {lang === 'ar' ? 'النقاش' : 'DISCUSSION'}
            </span>
          </MotionDiv>
          
          <MotionDiv
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            onClick={() => onNavigate('members')}
            className="bg-black/40 border border-white/10 hover:border-red-500/50 rounded-xl p-5 cursor-pointer flex flex-col items-center justify-center text-center group transition-all hover:bg-white/5"
          >
            <Users className="w-8 h-8 text-gray-400 group-hover:text-red-400 mb-3 transition-colors" />
            <span className="font-black uppercase tracking-widest text-xs group-hover:text-red-400 transition-colors">
              {lang === 'ar' ? 'الأعضاء' : 'MEMBERS'}
            </span>
          </MotionDiv>
          
          <MotionDiv
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            onClick={() => onNavigate('quotes')}
            className="bg-black/40 border border-white/10 hover:border-red-500/50 rounded-xl p-5 cursor-pointer flex flex-col items-center justify-center text-center group transition-all hover:bg-white/5"
          >
            <Quote className="w-8 h-8 text-gray-400 group-hover:text-red-400 mb-3 transition-colors" />
            <span className="font-black uppercase tracking-widest text-xs group-hover:text-red-400 transition-colors">
              {lang === 'ar' ? 'الاقتباسات' : 'QUOTES'}
            </span>
          </MotionDiv>
          
          <MotionDiv
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            onClick={() => onNavigate('stages')}
            className="bg-black/40 border border-white/10 hover:border-red-500/50 rounded-xl p-5 cursor-pointer flex flex-col items-center justify-center text-center group transition-all hover:bg-white/5"
          >
            <Flag className="w-8 h-8 text-gray-400 group-hover:text-red-400 mb-3 transition-colors" />
            <span className="font-black uppercase tracking-widest text-xs group-hover:text-red-400 transition-colors">
              {lang === 'ar' ? 'المراحل' : 'STAGES'}
            </span>
          </MotionDiv>
        </div>

        {/* Leave Club Button */}
        {club.myRole !== 'owner' && (
          <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-6">
            <button onClick={() => setShowLeaveConfirm(true)} className="w-full py-3 text-red-500 hover:bg-red-900/10 border border-red-900/30 rounded-xl font-black uppercase tracking-widest text-xs">
              {lang === 'ar' ? 'مغادرة النادي' : 'LEAVE CLUB'}
            </button>
          </MotionDiv>
        )}
      </div>

      {showLeaveConfirm && (
        <ConfirmDialog
          lang={lang}
          kind="warning"
          title={lang === 'ar' ? 'مغادرة النادي؟' : 'Leave Club?'}
          operationLabel={lang === 'ar' ? 'ستغادر هذا النادي' : 'You will leave this club'}
          consequencesLabel={lang === 'ar' ? 'يمكنك الانضمام مرة أخرى عبر رابط دعوة' : 'You can rejoin via an invite link'}
          permanenceLabel=""
          loading={leaving}
          onCancel={() => setShowLeaveConfirm(false)}
          onConfirm={handleLeave}
        />
      )}
    </div>
  );
};

export default ClubPage;
