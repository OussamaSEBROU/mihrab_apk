import React from 'react';
import { motion } from 'framer-motion';
import { Crown, UserPlus } from 'lucide-react';
import { ReadingClub, ClubUserProfile } from '../../types/readingClub';

const MotionDiv = motion.div as any;

interface ClubMembersProps {
  lang: 'ar' | 'en';
  club: ReadingClub;
  userProfile: ClubUserProfile;
  isOwner: boolean;
  onBack: () => void;
}

export default function ClubMembers({ lang, club, userProfile, isOwner }: ClubMembersProps) {
  const isRTL = lang === 'ar';

  const t = {
    invite: isRTL ? 'دعوة عضو' : 'Invite Member',
  };

  return (
    <div className="w-full h-full flex flex-col p-4 relative">
      <div className="flex-1 overflow-y-auto flex flex-col gap-4">
        {/* Mock member list */}
        <MotionDiv 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full bg-white/5 border border-white/10 rounded-[2rem] p-4 flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-red-600">
            <Crown size={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-[10px] text-white">OWNER NICKNAME</h3>
            <p className="text-[7.5px] text-white/50">Owner</p>
          </div>
        </MotionDiv>
      </div>

      {isOwner && (
        <button 
          className={`absolute bottom-6 ${isRTL ? 'left-6' : 'right-6'} w-14 h-14 bg-red-600 rounded-full flex items-center justify-center shadow-lg shadow-red-600/20 text-white z-10 hover:bg-red-700 transition-colors`}
        >
          <UserPlus size={24} />
        </button>
      )}
    </div>
  );
}
