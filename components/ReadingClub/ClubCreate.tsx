import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Globe, Lock, User, Loader2, AlertCircle } from 'lucide-react';
import { ReadingClub, ClubUserProfile } from '../../types/readingClub';
import { clubGroupsAPI } from '../../services/readingClubAPI';

const MotionDiv = motion.div as any;

interface ClubCreateProps {
  lang: 'ar' | 'en';
  books: any[];
  userProfile: ClubUserProfile;
  onCreated: (club: ReadingClub) => void;
  onBack: () => void;
}

export const ClubCreate: React.FC<ClubCreateProps> = ({ lang, books, userProfile, onCreated, onBack }) => {
  const isRTL = lang === 'ar';
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'private' | 'public' | 'personal'>('private');
  const [bookId, setBookId] = useState('');
  const [joinApprovalRequired, setJoinApprovalRequired] = useState(true);
  const [maxMembers, setMaxMembers] = useState(70);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(lang === 'ar' ? 'اسم النادي مطلوب' : 'Club name is required');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await clubGroupsAPI.create({
        name: name.trim(),
        description: description.trim(),
        privacy,
        settings: {
          joinApprovalRequired,
          maxMembers
        },
        currentBookId: bookId || undefined
      });
      
      if (response.success && response.data) {
        onCreated(response.data.group as any);
      } else {
        setError(response.error || 'Failed to create club');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full bg-[#000a00] text-white flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="p-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <button 
            onClick={onBack}
            className="p-2 -ml-2 rtl:-mr-2 rtl:ml-0 rounded-full hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className={`w-6 h-6 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <h1 className="text-xl font-black uppercase tracking-widest text-red-500">
            {lang === 'ar' ? 'إنشاء نادي جديد' : 'CREATE NEW CLUB'}
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto pb-8">
          
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">
              {lang === 'ar' ? 'اسم النادي' : 'CLUB NAME'} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={lang === 'ar' ? 'أدخل اسم النادي...' : 'Enter club name...'}
              className="w-full bg-black/50 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-medium"
              maxLength={50}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">
              {lang === 'ar' ? 'الوصف' : 'DESCRIPTION'}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={lang === 'ar' ? 'عن ماذا يتحدث هذا النادي؟ (اختياري)' : 'What is this club about? (Optional)'}
              className="w-full bg-black/50 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all min-h-[100px] resize-y"
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">
              {lang === 'ar' ? 'الخصوصية' : 'PRIVACY'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPrivacy('private')}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                  privacy === 'private' ? 'bg-red-900/20 border-red-500 text-white' : 'bg-black/30 border-white/10 text-gray-500 hover:border-white/30'
                }`}
              >
                <Lock className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {lang === 'ar' ? 'خاص' : 'PRIVATE'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPrivacy('public')}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                  privacy === 'public' ? 'bg-red-900/20 border-red-500 text-white' : 'bg-black/30 border-white/10 text-gray-500 hover:border-white/30'
                }`}
              >
                <Globe className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {lang === 'ar' ? 'عام' : 'PUBLIC'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPrivacy('personal')}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                  privacy === 'personal' ? 'bg-red-900/20 border-red-500 text-white' : 'bg-black/30 border-white/10 text-gray-500 hover:border-white/30'
                }`}
              >
                <User className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {lang === 'ar' ? 'شخصي' : 'PERSONAL'}
                </span>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {privacy === 'private' && (lang === 'ar' ? 'مخفي عن العامة. بالدعوة فقط.' : 'Hidden from public. Invite only.')}
              {privacy === 'public' && (lang === 'ar' ? 'مرئي للجميع. يمكن لأي شخص طلب الانضمام.' : 'Visible to all. Anyone can request to join.')}
              {privacy === 'personal' && (lang === 'ar' ? 'للاستخدام الشخصي فقط. لا يوجد أعضاء آخرين.' : 'For personal use only. No other members.')}
            </p>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">
              {lang === 'ar' ? 'الكتاب الحالي (اختياري)' : 'CURRENT BOOK (OPTIONAL)'}
            </label>
            <select
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 appearance-none"
            >
              <option value="">{lang === 'ar' ? '-- بدون كتاب الآن --' : '-- No book for now --'}</option>
              {books.map(book => (
                <option key={book.id || book._id} value={book.id || book._id}>
                  {book.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-4 pt-4 border-t border-white/10">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">
              {lang === 'ar' ? 'الإعدادات' : 'SETTINGS'}
            </h3>
            
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium">
                {lang === 'ar' ? 'الموافقة على الانضمام مطلوبة' : 'Require join approval'}
              </span>
              <div className="relative">
                <input 
                  type="checkbox" 
                  checked={joinApprovalRequired}
                  onChange={(e) => setJoinApprovalRequired(e.target.checked)}
                  className="sr-only" 
                />
                <div className={`block w-10 h-6 rounded-full transition-colors ${joinApprovalRequired ? 'bg-red-600' : 'bg-gray-600'}`}></div>
                <div className={`dot absolute top-1 ${isRTL ? 'right-1' : 'left-1'} bg-white w-4 h-4 rounded-full transition-transform ${joinApprovalRequired ? (isRTL ? '-translate-x-4' : 'translate-x-4') : ''}`}></div>
              </div>
            </label>

            <div>
              <div className="flex justify-between text-sm font-medium mb-1">
                <span>{lang === 'ar' ? 'الحد الأقصى للأعضاء' : 'Max Members'}</span>
                <span className="text-red-500 font-bold">{maxMembers}</span>
              </div>
              <input
                type="range"
                min="2"
                max="70"
                value={maxMembers}
                onChange={(e) => setMaxMembers(parseInt(e.target.value))}
                className="w-full accent-red-600"
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
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse bg-red-600 hover:bg-red-700 text-white py-4 rounded-lg font-black uppercase tracking-widest transition-colors disabled:opacity-50 mt-8"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>{lang === 'ar' ? 'حفظ وإنشاء' : 'SAVE & CREATE'}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
