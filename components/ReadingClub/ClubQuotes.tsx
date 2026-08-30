import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Quote, Plus } from 'lucide-react';
import { ReadingClub, ClubUserProfile } from '../../types/readingClub';

const MotionDiv = motion.div as any;

interface ClubQuotesProps {
  lang: 'ar' | 'en';
  club: ReadingClub;
  userProfile: ClubUserProfile;
  onBack: () => void;
}

export default function ClubQuotes({ lang, club, userProfile }: ClubQuotesProps) {
  const [quotes, setQuotes] = useState<any[]>([]);
  const isRTL = lang === 'ar';

  const t = {
    empty: isRTL ? 'لا توجد اقتباسات بعد' : 'No quotes yet',
    add: isRTL ? 'أضف اقتباساً' : 'Add Quote'
  };

  useEffect(() => {
    // Mock load
    setQuotes([]);
  }, [club.id]);

  return (
    <div className="w-full h-full relative p-4 overflow-y-auto">
      {quotes.length === 0 ? (
        <div className="w-full h-full flex flex-col items-center justify-center opacity-50">
          <Quote size={64} className="text-red-600 mb-4 opacity-50" />
          <p className="text-[10px]">{t.empty}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Render quotes here */}
        </div>
      )}
      
      <button 
        className={`absolute bottom-6 ${isRTL ? 'left-6' : 'right-6'} w-14 h-14 bg-red-600 rounded-full flex items-center justify-center shadow-lg shadow-red-600/20 text-white z-10 hover:bg-red-700 transition-colors`}
      >
        <Plus size={24} />
      </button>
    </div>
  );
}
