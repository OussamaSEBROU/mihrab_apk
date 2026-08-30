import React from 'react';
import { motion } from 'framer-motion';
import { Settings, BookOpen, MessageSquare, Quote, Users } from 'lucide-react';
import { ReadingClub, ClubUserProfile } from '../../types/readingClub';

const MotionDiv = motion.div as any;

interface ClubPageProps {
  lang: 'ar' | 'en';
  club: ReadingClub;
  userProfile: ClubUserProfile;
  onBack: () => void;
  onNavigate: (view: string, data?: any) => void;
}

export default function ClubPage({ lang, club, userProfile, onBack, onNavigate }: ClubPageProps) {
  const isRTL = lang === 'ar';
  const isOwner = club.ownerId === userProfile.id;

  const t = {
    stages: isRTL ? 'المراحل' : 'Stages',
    discussion: isRTL ? 'النقاش' : 'Discussion',
    quotes: isRTL ? 'الاقتباسات' : 'Quotes',
    members: isRTL ? 'الأعضاء' : 'Members',
    membersCount: isRTL ? 'عضو' : 'Member(s)',
    upcoming: isRTL ? 'قادم' : 'Upcoming',
    active: isRTL ? 'نشط' : 'Active',
    completed: isRTL ? 'مكتمل' : 'Completed',
    archived: isRTL ? 'مؤرشف' : 'Archived'
  };

  const navItems = [
    { id: 'stages', icon: BookOpen, title: t.stages, color: 'text-blue-400' },
    { id: 'discussion', icon: MessageSquare, title: t.discussion, color: 'text-purple-400' },
    { id: 'quotes', icon: Quote, title: t.quotes, color: 'text-emerald-400' },
    { id: 'members', icon: Users, title: t.members, color: 'text-orange-400' }
  ];

  return (
    <div className="w-full h-full flex flex-col p-4 gap-4 overflow-y-auto">
      <MotionDiv 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 relative"
      >
        {isOwner && (
          <button className="absolute top-4 left-4 p-2 text-white/50 hover:text-white transition-colors">
            <Settings size={20} />
          </button>
        )}
        
        <div className="flex flex-col items-center mt-4">
          <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mb-4 text-red-600 shadow-lg shadow-red-600/10">
            <BookOpen size={32} />
          </div>
          <h2 className="text-red-600 text-lg text-center mb-2">{club.name}</h2>
          <p className="text-[10px] text-white/70 text-center mb-4">{club.bookTitle}</p>
          
          <div className="flex gap-4 text-[7.5px]">
            <span className="px-3 py-1 bg-white/10 rounded-full">{t[club.status as keyof typeof t] || club.status}</span>
            <span className="px-3 py-1 bg-white/10 rounded-full">{club.maxMembers} {t.membersCount}</span>
          </div>
        </div>
      </MotionDiv>

      <div className="grid grid-cols-2 gap-4 mt-2">
        {navItems.map((item, idx) => (
          <MotionDiv
            key={item.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate(item.id)}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 flex flex-col items-center justify-center gap-3 cursor-pointer"
          >
            <item.icon size={28} className={item.color} />
            <span className="text-[10px]">{item.title}</span>
          </MotionDiv>
        ))}
      </div>
    </div>
  );
}
