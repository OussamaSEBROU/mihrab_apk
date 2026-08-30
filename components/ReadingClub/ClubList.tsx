import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, User, Lock, Globe, BookOpen } from 'lucide-react';
import { ReadingClub, ClubUserProfile } from '../../types/readingClub';

const MotionDiv = motion.div as any;

interface ClubListProps {
  lang: 'ar' | 'en';
  clubs: ReadingClub[];
  userProfile: ClubUserProfile;
  onCreateClub: () => void;
  onSelectClub: (club: ReadingClub) => void;
}

export default function ClubList({ lang, clubs, onCreateClub, onSelectClub }: ClubListProps) {
  const isRTL = lang === 'ar';
  
  const t = {
    empty: isRTL ? 'لا توجد أندية بعد' : 'No clubs yet',
    createFirst: isRTL ? 'أنشئ ناديك الأول' : 'Create your first club',
    members: isRTL ? 'أعضاء' : 'Members',
    upcoming: isRTL ? 'قادم' : 'Upcoming',
    active: isRTL ? 'نشط' : 'Active',
    completed: isRTL ? 'مكتمل' : 'Completed',
    archived: isRTL ? 'مؤرشف' : 'Archived'
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'upcoming': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'active': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'completed': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
      case 'archived': return 'text-white/50 bg-white/5 border-white/10';
      default: return 'text-white/50 bg-white/5 border-white/10';
    }
  };

  const getStatusText = (status: string) => t[status as keyof typeof t] || status;

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'personal': return <User size={12} />;
      case 'private': return <Lock size={12} />;
      case 'public': return <Globe size={12} />;
      default: return <User size={12} />;
    }
  };

  return (
    <div className="w-full h-full p-4 overflow-y-auto pb-24">
      {clubs.length === 0 ? (
        <div className="w-full h-full flex flex-col items-center justify-center opacity-50">
          <BookOpen size={64} className="text-red-600 mb-4 opacity-50" />
          <p className="text-[10px] mb-2">{t.empty}</p>
          <p className="text-[7.5px]">{t.createFirst}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {clubs.map((club, idx) => (
            <MotionDiv 
              key={club.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectClub(club)}
              className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-4 flex flex-col gap-3 cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-red-600 text-[10px] mb-1">{club.name}</h3>
                  <p className="text-white/70 text-[7.5px] truncate">{club.bookTitle}</p>
                </div>
                <div className={`px-3 py-1 rounded-full border text-[7.5px] flex items-center gap-1 ${getStatusColor(club.status)}`}>
                  {getStatusText(club.status)}
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-2 border-t border-white/10 pt-3">
                <div className="flex items-center gap-2 text-white/50 text-[7.5px]">
                  {getTypeIcon(club.type)}
                  <span>{club.type}</span>
                </div>
                <div className="flex items-center gap-1 text-white/50 text-[7.5px]">
                  <Users size={12} />
                  <span>{club.maxMembers} {t.members}</span>
                </div>
              </div>
            </MotionDiv>
          ))}
        </div>
      )}

      <button 
        onClick={onCreateClub}
        className={`absolute bottom-6 ${isRTL ? 'left-6' : 'right-6'} w-14 h-14 bg-red-600 rounded-full flex items-center justify-center shadow-lg shadow-red-600/20 text-white z-10 hover:bg-red-700 transition-colors`}
      >
        <Plus size={24} />
      </button>
    </div>
  );
}
