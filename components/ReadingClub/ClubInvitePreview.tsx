import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, Users, BookOpen, AlertCircle, CheckCircle } from 'lucide-react';
import { ReadingClub, ClubUserProfile } from '../../types/readingClub';
import { clubInvitesAPI } from '../../services/readingClubAPI';

const MotionDiv = motion.div as any;

interface Props {
  lang: 'ar' | 'en';
  inviteToken: string;
  userProfile: ClubUserProfile | null;
  onJoined: (club: ReadingClub) => void;
  onBack: () => void;
}

export default function ClubInvitePreview({ lang, inviteToken, userProfile, onJoined, onBack }: Props) {
  const isRTL = lang === 'ar';
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [joinStatus, setJoinStatus] = useState('');

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const res = await clubInvitesAPI.preview(inviteToken);
        setPreview(res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Invalid or expired invite link');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPreview();
  }, [inviteToken]);

  const handleJoin = async () => {
    if (!userProfile) return;
    setIsJoining(true);
    try {
      const res = await clubInvitesAPI.join(inviteToken);
      if (res.data.status === 'pending') {
        setJoinStatus('pending');
      } else {
        onJoined(res.data.club);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to join club');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-[#000a00] text-white ${isRTL ? 'dir-rtl' : 'dir-ltr'}`}>
      <div className="p-4">
        <button onClick={onBack} className="text-red-600 p-2 hover:bg-red-900/20 rounded-full">
          {isRTL ? <ArrowRight size={24} /> : <ArrowLeft size={24} />}
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        {isLoading ? (
          <Loader2 className="animate-spin text-red-600" size={48} />
        ) : error ? (
          <MotionDiv initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-red-900/20 border border-red-600/50 rounded-2xl p-8 text-center max-w-sm w-full">
            <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
            <h2 className="font-black uppercase tracking-widest text-lg mb-2 text-red-500">{isRTL ? 'خطأ' : 'Error'}</h2>
            <p className="text-gray-300 text-sm">{error}</p>
          </MotionDiv>
        ) : joinStatus === 'pending' ? (
          <MotionDiv initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-gray-900 border border-green-600/50 rounded-2xl p-8 text-center max-w-sm w-full">
            <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
            <h2 className="font-black uppercase tracking-widest text-lg mb-2 text-green-500">{isRTL ? 'تم الإرسال' : 'Request Sent'}</h2>
            <p className="text-gray-300 text-sm">{isRTL ? 'طلب الانضمام الخاص بك قيد المراجعة.' : 'Your join request is pending approval.'}</p>
          </MotionDiv>
        ) : preview ? (
          <MotionDiv initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-gradient-to-b from-gray-900 to-black border border-gray-800 rounded-3xl p-8 w-full max-w-sm shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-900 via-red-600 to-red-900"></div>
            
            <div className="text-center mb-8">
              <h1 className="text-2xl font-black uppercase tracking-widest mb-2">{preview.name}</h1>
              {preview.description && <p className="text-gray-400 text-sm">{preview.description}</p>}
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 bg-black/50 p-3 rounded-xl border border-gray-800/50">
                <BookOpen className="text-red-600" size={20} />
                <span className="text-sm font-bold text-gray-300">{preview.bookTitle || (isRTL ? 'كتاب غير محدد' : 'Unknown Book')}</span>
              </div>
              <div className="flex items-center gap-3 bg-black/50 p-3 rounded-xl border border-gray-800/50">
                <Users className="text-red-600" size={20} />
                <span className="text-sm font-bold text-gray-300">{preview.memberCount} {isRTL ? 'أعضاء' : 'Members'}</span>
              </div>
            </div>

            {!userProfile ? (
              <div className="text-center text-yellow-500 text-sm font-bold bg-yellow-900/20 p-4 rounded-xl">
                {isRTL ? 'يجب إعداد ملفك الشخصي أولاً للانضمام.' : 'You must setup your profile first to join.'}
              </div>
            ) : (
              <button onClick={handleJoin} disabled={isJoining} className="w-full bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                {isJoining ? <Loader2 className="animate-spin" size={20} /> : (isRTL ? 'انضمام للنادي' : 'Join Club')}
              </button>
            )}
          </MotionDiv>
        ) : null}
      </div>
    </div>
  );
}
