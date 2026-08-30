import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, BookOpen, Brain, Sparkles, Star, Heart, Flame, Leaf, Moon, Sun, Crown, Gem, Check } from 'lucide-react';
import { ClubUserProfile } from '../../types/readingClub';
import { readingClubStorage } from '../../services/readingClubStorage';

const MotionDiv = motion.div as any;

interface ClubSetupProfileProps {
  lang: 'ar' | 'en';
  onComplete: (profile: ClubUserProfile) => void;
}

const AVATARS = [User, BookOpen, Brain, Sparkles, Star, Heart, Flame, Leaf, Moon, Sun, Crown, Gem];

export default function ClubSetupProfile({ lang, onComplete }: ClubSetupProfileProps) {
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(0);

  const isRTL = lang === 'ar';
  const t = {
    title: isRTL ? 'أنشئ هويتك' : 'Create Your Identity',
    subtitle: isRTL ? 'لنادي القراءة الخاص بك' : 'For your reading club',
    nickname: isRTL ? 'الاسم المستعار' : 'Nickname',
    confirm: isRTL ? 'تأكيد' : 'Confirm',
  };

  const handleConfirm = async () => {
    if (!nickname.trim()) return;
    const profile: ClubUserProfile = {
      id: 'club_user_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
      nickname: nickname.trim(),
      avatarIndex: selectedAvatar,
      createdAt: Date.now()
    };
    await readingClubStorage.saveUserProfile(profile);
    onComplete(profile);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-[#000a00] font-black uppercase tracking-widest text-white" dir={isRTL ? 'rtl' : 'ltr'}>
      <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 flex flex-col gap-6">
        <div className="text-center">
          <h2 className="text-red-600 text-lg mb-2">{t.title}</h2>
          <p className="text-white/50 text-[7.5px]">{t.subtitle}</p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[7.5px] text-white/50 ml-2">{t.nickname}</label>
          <input 
            type="text" 
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            className="bg-black/50 border border-white/10 rounded-2xl p-4 text-[10px] text-white focus:outline-none focus:border-red-600/50 transition-colors"
          />
        </div>

        <div className="grid grid-cols-4 gap-4">
          {AVATARS.map((Icon, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedAvatar(idx)}
              className={`aspect-square rounded-2xl flex items-center justify-center transition-all ${selectedAvatar === idx ? 'bg-red-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
            >
              <Icon size={24} />
            </button>
          ))}
        </div>

        <button
          onClick={handleConfirm}
          disabled={!nickname.trim()}
          className="mt-4 w-full bg-red-600 text-white py-4 rounded-2xl text-[10px] flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t.confirm}
          <Check size={16} />
        </button>
      </MotionDiv>
    </div>
  );
}
