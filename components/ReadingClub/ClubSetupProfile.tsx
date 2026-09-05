import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Copy, CheckCircle, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { ClubUserProfile } from '../../types/readingClub';
import { readingClubAuth } from '../../services/readingClubAuth';

const MotionDiv = motion.div as any;

const AVATARS = ['📚','🦉','🌙','⭐','🔥','📖','🎯','💎','🌿','🏛️','✨','🕌'];

interface ClubSetupProfileProps {
  lang: 'ar' | 'en';
  onComplete: (profile: ClubUserProfile) => void;
}

export const ClubSetupProfile: React.FC<ClubSetupProfileProps> = ({ lang, onComplete }) => {
  const isRTL = lang === 'ar';
  const [nickname, setNickname] = useState('');
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [savedProfile, setSavedProfile] = useState<ClubUserProfile | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async () => {
    if (nickname.length < 2 || nickname.length > 30) {
      setError(lang === 'ar' ? 'الاسم يجب أن يكون بين 2 و 30 حرف' : 'Nickname must be between 2 and 30 characters');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await readingClubAuth.register(nickname, avatarIndex);
      if (response.success && response.profile) {
        if (response.recoveryCode) {
          setRecoveryCode(response.recoveryCode);
          setSavedProfile(response.profile);
        } else {
          onComplete(response.profile);
        }
      } else {
        // ===== OFFLINE-FIRST FALLBACK =====
        // If server is unreachable, save profile locally and proceed
        const offlineProfile: ClubUserProfile = {
          id: 'local_' + Date.now(),
          deviceId: 'pending',
          nickname: nickname,
          avatarIndex: avatarIndex,
          token: '',
          serverUserId: '',
          createdAt: Date.now()
        };
        localStorage.setItem('sanctuary_club_profile', JSON.stringify(offlineProfile));
        onComplete(offlineProfile);
      }
    } catch (err: any) {
      // ===== OFFLINE-FIRST FALLBACK ON EXCEPTION =====
      const offlineProfile: ClubUserProfile = {
        id: 'local_' + Date.now(),
        deviceId: 'pending',
        nickname: nickname,
        avatarIndex: avatarIndex,
        token: '',
        serverUserId: '',
        createdAt: Date.now()
      };
      localStorage.setItem('sanctuary_club_profile', JSON.stringify(offlineProfile));
      onComplete(offlineProfile);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = () => {
    readingClubAuth.markRecoveryShown();
    if (savedProfile) {
      onComplete(savedProfile);
    } else {
      const localProfile = readingClubAuth.getLocalProfile();
      if (localProfile) onComplete(localProfile);
    }
  };

  const handleCopy = () => {
    if (recoveryCode) {
      navigator.clipboard.writeText(recoveryCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (recoveryCode) {
    return (
      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-auto p-6 bg-[#000a00] text-white border border-red-900/30 rounded-xl"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-600/30">
            <AlertCircle className="text-red-500 w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-widest text-red-500 mb-2">
            {lang === 'ar' ? 'رمز الاسترداد الخاص بك' : 'Your Recovery Code'}
          </h2>
          <p className="text-gray-400 text-sm">
            {lang === 'ar' 
              ? 'يرجى حفظ هذا الرمز في مكان آمن. ستحتاجه لاستعادة حسابك إذا قمت بحذف التطبيق أو تغيير جهازك.' 
              : 'Please save this code in a safe place. You will need it to recover your account if you delete the app or change your device.'}
          </p>
        </div>

        <div className="bg-black/50 p-6 rounded-lg border border-red-900/30 mb-8 flex flex-col items-center justify-center relative">
          <span className="text-3xl font-mono tracking-[0.5em] text-white">{recoveryCode}</span>
          <button 
            onClick={handleCopy}
            className="absolute top-2 right-2 p-2 bg-red-900/20 hover:bg-red-900/40 rounded transition-colors"
            title={lang === 'ar' ? 'نسخ' : 'Copy'}
          >
            {copied ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-gray-400" />}
          </button>
        </div>

        <button
          onClick={handleAcknowledge}
          className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse bg-red-600 hover:bg-red-700 text-white py-4 rounded-lg font-black uppercase tracking-widest transition-colors"
        >
          <span>{lang === 'ar' ? 'لقد قمت بحفظ الرمز' : 'I Have Saved The Code'}</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </MotionDiv>
    );
  }

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto p-6 bg-[#000a00] text-white"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black uppercase tracking-widest text-red-500 mb-2">
          {lang === 'ar' ? 'إنشاء ملفك الشخصي' : 'Create Profile'}
        </h2>
        <p className="text-gray-400 text-sm">
          {lang === 'ar' ? 'انضم إلى أندية القراءة' : 'Join reading clubs'}
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">
            {lang === 'ar' ? 'اختر صورة' : 'Choose Avatar'}
          </label>
          <div className="grid grid-cols-4 gap-3">
            {AVATARS.map((emoji, index) => (
              <button
                key={index}
                onClick={() => setAvatarIndex(index)}
                className={`text-3xl p-3 rounded-lg border transition-all ${
                  avatarIndex === index 
                    ? 'border-red-500 bg-red-900/20 scale-110' 
                    : 'border-white/10 hover:border-white/30 bg-black/30 hover:bg-black/50'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">
            {lang === 'ar' ? 'الاسم المستعار' : 'Nickname'}
          </label>
          <div className="relative">
            <div className={`absolute top-0 bottom-0 ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
              <User className="text-gray-500 w-5 h-5" />
            </div>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={lang === 'ar' ? 'أدخل اسمك...' : 'Enter your name...'}
              className={`w-full bg-black/50 border border-white/10 rounded-lg py-3 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-medium`}
              maxLength={30}
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg flex items-start space-x-2 rtl:space-x-reverse">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !nickname.trim()}
          className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse bg-red-600 hover:bg-red-700 text-white py-4 rounded-lg font-black uppercase tracking-widest transition-colors disabled:opacity-50 mt-4"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <span>{lang === 'ar' ? 'متابعة' : 'Continue'}</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </MotionDiv>
  );
};

export default ClubSetupProfile;
