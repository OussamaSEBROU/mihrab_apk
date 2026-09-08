import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, BookOpen, RefreshCw, Lock, Globe, User } from 'lucide-react';
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
}

export const ClubList: React.FC<ClubListProps> = ({ 
  lang, 
  clubs, 
  userProfile, 
  onCreateClub, 
  onSelectClub, 
  onRefresh,
  loading = false
}) => {
  const isRTL = lang === 'ar';

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
            <button
              onClick={onCreateClub}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-black uppercase tracking-widest transition-colors flex items-center space-x-2 rtl:space-x-reverse"
            >
              <Plus className="w-5 h-5" />
              <span>{lang === 'ar' ? 'إنشاء نادي' : 'CREATE CLUB'}</span>
            </button>
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

      {clubs.length > 0 && (
        <button
          onClick={onCreateClub}
          className={`absolute bottom-6 ${isRTL ? 'left-6' : 'right-6'} w-14 h-14 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-900/50 transition-transform hover:scale-105 active:scale-95`}
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};

export default ClubList;
