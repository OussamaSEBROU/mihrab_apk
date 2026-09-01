import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, MessageSquare, Users, Quote, Flag, Share2, Settings, BookOpen, Loader2, Copy, CheckCircle } from 'lucide-react';
import { ReadingClub, ClubUserProfile, ClubView } from '../../types/readingClub';
import { clubInvitesAPI } from '../../services/readingClubAPI';

const MotionDiv = motion.div as any;

interface ClubPageProps {
  lang: 'ar' | 'en';
  club: ReadingClub;
  userProfile: ClubUserProfile;
  onBack: () => void;
  onNavigate: (view: ClubView, data?: any) => void;
}

export const ClubPage: React.FC<ClubPageProps> = ({ lang, club, userProfile, onBack, onNavigate }) => {
  const isRTL = lang === 'ar';
  
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isOwnerOrAdmin = club.myRole === 'owner' || club.myRole === 'admin';

  const handleInvite = async () => {
    if (inviteToken) return;
    
    setGeneratingInvite(true);
    try {
      const response = await clubInvitesAPI.create(club._id);
      if (response.success && response.data) {
        setInviteToken(response.data.token);
      }
    } catch (err) {
      console.error('Failed to create invite:', err);
    } finally {
      setGeneratingInvite(false);
    }
  };

  const copyInvite = () => {
    if (inviteToken) {
      const url = `${window.location.origin}/join/${inviteToken}`;
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div className="w-full h-full bg-[#000a00] text-white flex flex-col relative" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="p-4 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center space-x-3 rtl:space-x-reverse flex-1">
          <button 
            onClick={onBack}
            className="p-2 -ml-2 rtl:-mr-2 rtl:ml-0 rounded-full hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className={`w-6 h-6 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <div className="flex-1 truncate">
            <h1 className="text-lg font-black uppercase tracking-widest text-red-500 truncate">
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
          <h2 className="text-2xl font-black uppercase tracking-widest mb-2">{club.name}</h2>
          {club.description && (
            <p className="text-sm text-gray-400 max-w-sm mx-auto">{club.description}</p>
          )}
        </MotionDiv>

        {/* Current Book */}
        {club.currentBookTitle && (
          <MotionDiv
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-black/40 border border-white/10 rounded-xl p-4 flex items-center space-x-4 rtl:space-x-reverse"
          >
            <div className="w-12 h-16 bg-red-900/30 rounded flex items-center justify-center border border-red-500/20 shrink-0">
              <BookOpen className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">
                {lang === 'ar' ? 'نقرأ الآن' : 'CURRENTLY READING'}
              </p>
              <h3 className="font-bold text-sm line-clamp-2">{club.currentBookTitle}</h3>
            </div>
          </MotionDiv>
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
                className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse py-2 text-red-400 hover:text-red-300 font-bold uppercase text-sm tracking-wider"
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
                <span className="text-xs font-mono text-gray-300 truncate mr-3 rtl:mr-0 rtl:ml-3">
                  {window.location.origin}/join/{inviteToken}
                </span>
                <button
                  onClick={copyInvite}
                  className="p-2 hover:bg-white/10 rounded transition-colors text-white"
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
      </div>
    </div>
  );
};

export default ClubPage;
