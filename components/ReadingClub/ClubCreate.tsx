import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, User, Lock, Globe, BookOpen } from 'lucide-react';
import { ReadingClub, ClubUserProfile } from '../../types/readingClub';
import { readingClubStorage } from '../../services/readingClubStorage';

const MotionDiv = motion.div as any;

interface ClubCreateProps {
  lang: 'ar' | 'en';
  books: any[];
  userProfile: ClubUserProfile;
  onCreated: (club: ReadingClub) => void;
  onBack: () => void;
}

export default function ClubCreate({ lang, books, userProfile, onCreated, onBack }: ClubCreateProps) {
  const [step, setStep] = useState(1);
  const [type, setType] = useState<'personal' | 'private' | 'public'>('personal');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedBook, setSelectedBook] = useState<any>(null);

  const isRTL = lang === 'ar';
  
  const t = {
    step1: isRTL ? 'نوع النادي' : 'Club Type',
    step2: isRTL ? 'تفاصيل النادي' : 'Club Details',
    step3: isRTL ? 'الكتاب المختار' : 'Selected Book',
    personal: isRTL ? 'شخصي' : 'Personal',
    personalDesc: isRTL ? 'لك وحدك لتتبع قراءتك' : 'Just for you to track reading',
    private: isRTL ? 'خاص' : 'Private',
    privateDesc: isRTL ? 'بدعوة فقط للأصدقاء' : 'Invite-only for friends',
    public: isRTL ? 'عام' : 'Public',
    publicDesc: isRTL ? 'مفتوح للجميع للانضمام' : 'Open for anyone to join',
    name: isRTL ? 'اسم النادي' : 'Club Name',
    desc: isRTL ? 'وصف النادي' : 'Description',
    selectBook: isRTL ? 'اختر كتاباً' : 'Select a Book',
    next: isRTL ? 'التالي' : 'Next',
    create: isRTL ? 'إنشاء النادي' : 'Create Club'
  };

  const handleCreate = async () => {
    const now = Date.now();
    const newClub: ReadingClub = {
      id: 'club_' + now.toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      name,
      description,
      type,
      bookId: selectedBook?.id || '',
      bookTitle: selectedBook?.title || '',
      bookAuthor: selectedBook?.author || '',
      ownerId: userProfile.id,
      status: 'upcoming',
      maxMembers: type === 'personal' ? 1 : 50,
      joinApprovalRequired: type === 'private',
      startDate: new Date().toISOString().split('T')[0],
      createdAt: now,
      updatedAt: now,
      syncStatus: 'local-only',
      version: 1,
      inviteCode: type === 'private' ? Math.random().toString(36).slice(2, 8).toUpperCase() : undefined,
    };
    await readingClubStorage.addClub(newClub);
    onCreated(newClub);
  };

  const renderStep1 = () => (
    <div className="flex flex-col gap-4">
      <h2 className="text-red-600 text-[10px] mb-4">{t.step1}</h2>
      {[
        { id: 'personal', icon: User, title: t.personal, desc: t.personalDesc },
        { id: 'private', icon: Lock, title: t.private, desc: t.privateDesc },
        { id: 'public', icon: Globe, title: t.public, desc: t.publicDesc }
      ].map(opt => (
        <div 
          key={opt.id}
          onClick={() => setType(opt.id as any)}
          className={`p-4 rounded-[2rem] border cursor-pointer transition-all flex items-center gap-4 ${type === opt.id ? 'bg-red-600/10 border-red-600 text-white' : 'bg-white/5 border-white/10 text-white/70'}`}
        >
          <div className={`p-3 rounded-full ${type === opt.id ? 'bg-red-600' : 'bg-white/10'}`}>
            <opt.icon size={20} className={type === opt.id ? 'text-white' : 'text-white/50'} />
          </div>
          <div>
            <h3 className="text-[10px]">{opt.title}</h3>
            <p className="text-[7.5px] opacity-70 mt-1">{opt.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );

  const renderStep2 = () => (
    <div className="flex flex-col gap-4">
      <h2 className="text-red-600 text-[10px] mb-4">{t.step2}</h2>
      <div className="flex flex-col gap-2">
        <label className="text-[7.5px] text-white/50 ml-2">{t.name}</label>
        <input 
          type="text" 
          value={name}
          onChange={e => setName(e.target.value)}
          className="bg-black/50 border border-white/10 rounded-2xl p-4 text-[10px] text-white focus:outline-none focus:border-red-600/50"
        />
      </div>
      <div className="flex flex-col gap-2 mt-4">
        <label className="text-[7.5px] text-white/50 ml-2">{t.desc}</label>
        <textarea 
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          className="bg-black/50 border border-white/10 rounded-2xl p-4 text-[10px] text-white focus:outline-none focus:border-red-600/50 resize-none"
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="flex flex-col gap-4 h-full">
      <h2 className="text-red-600 text-[10px] mb-4">{t.step3}</h2>
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 pb-20">
        {books && books.length > 0 ? books.map((book, idx) => (
          <div 
            key={idx}
            onClick={() => setSelectedBook(book)}
            className={`p-4 rounded-[2rem] border cursor-pointer flex items-center gap-4 ${selectedBook?.id === book.id ? 'bg-red-600/10 border-red-600' : 'bg-white/5 border-white/10'}`}
          >
            <BookOpen size={24} className="text-white/50" />
            <div className="flex-1 truncate text-[10px]">{book.title}</div>
          </div>
        )) : (
          <div className="text-center text-white/50 text-[10px] p-8">No books available</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col p-4">
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <MotionDiv 
            key={step} 
            initial={{ opacity: 0, x: isRTL ? -20 : 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
            className="h-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6"
          >
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </MotionDiv>
        </AnimatePresence>
      </div>

      <div className="flex justify-between items-center mt-4">
        <button 
          onClick={() => step > 1 ? setStep(step - 1) : onBack()}
          className="p-4 bg-white/5 rounded-2xl text-white/50 hover:bg-white/10 transition-colors"
        >
          {isRTL ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
        </button>
        
        <button 
          onClick={() => {
            if (step < 3) setStep(step + 1);
            else handleCreate();
          }}
          disabled={(step === 2 && !name.trim()) || (step === 3 && !selectedBook)}
          className="px-8 py-4 bg-red-600 text-white rounded-2xl text-[10px] disabled:opacity-50 transition-colors"
        >
          {step === 3 ? t.create : t.next}
        </button>
      </div>
    </div>
  );
}
