import React from 'react';
import { motion } from 'framer-motion';
import { Check, Plus } from 'lucide-react';
import { ReadingClub, ClubUserProfile } from '../../types/readingClub';

const MotionDiv = motion.div as any;

interface ClubStagesProps {
  lang: 'ar' | 'en';
  club: ReadingClub;
  userProfile: ClubUserProfile;
  isOwner: boolean;
  onBack: () => void;
}

export default function ClubStages({ lang, club, userProfile, isOwner }: ClubStagesProps) {
  const isRTL = lang === 'ar';
  
  const t = {
    empty: isRTL ? 'لا توجد مراحل محددة بعد' : 'No stages defined yet',
  };

  return (
    <div className="w-full h-full relative p-4 overflow-y-auto">
      <div className="w-full h-full flex flex-col items-center justify-center opacity-50">
        <p className="text-[10px]">{t.empty}</p>
      </div>

      {isOwner && (
        <button 
          className={`absolute bottom-6 ${isRTL ? 'left-6' : 'right-6'} w-14 h-14 bg-red-600 rounded-full flex items-center justify-center shadow-lg shadow-red-600/20 text-white z-10 hover:bg-red-700 transition-colors`}
        >
          <Plus size={24} />
        </button>
      )}
    </div>
  );
}
