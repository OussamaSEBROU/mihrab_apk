import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Quote, Plus, Loader2, Trash2 } from 'lucide-react';
import { ReadingClub, ClubUserProfile } from '../../types/readingClub';
import { clubQuotesAPI } from '../../services/readingClubAPI';

const MotionDiv = motion.div as any;

interface Props {
  lang: 'ar' | 'en';
  club: ReadingClub;
  userProfile: ClubUserProfile;
  onBack: () => void;
}

export default function ClubQuotes({ lang, club, userProfile, onBack }: Props) {
  const isRTL = lang === 'ar';
  const [quotes, setQuotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newQuoteText, setNewQuoteText] = useState('');
  const [newPageRef, setNewPageRef] = useState('');

  const load = async () => {
    try {
      const res = await clubQuotesAPI.list(club._id);
      setQuotes(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [club._id]);

  const handleAdd = async () => {
    if (!newQuoteText.trim()) return;
    try {
      await clubQuotesAPI.create(club._id, { quoteText: newQuoteText, pageReference: newPageRef });
      setNewQuoteText('');
      setNewPageRef('');
      setIsAdding(false);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await clubQuotesAPI.delete(club._id, id);
      setQuotes(prev => prev.filter(q => q._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-[#000a00] text-white ${isRTL ? 'dir-rtl' : 'dir-ltr'}`}>
      <div className="flex items-center justify-between p-4 border-b border-red-900/30">
        <button onClick={onBack} className="text-red-600 p-2 hover:bg-red-900/20 rounded-full">
          {isRTL ? <ArrowRight size={24} /> : <ArrowLeft size={24} />}
        </button>
        <h1 className="font-black uppercase tracking-widest text-lg">{isRTL ? 'الاقتباسات' : 'Quotes'}</h1>
        <button onClick={() => setIsAdding(!isAdding)} className="text-red-600 p-2 hover:bg-red-900/20 rounded-full">
          <Plus size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isAdding && (
          <MotionDiv initial={{ opacity: 0, h: 0 }} animate={{ opacity: 1, h: 'auto' }} className="bg-red-900/10 border border-red-600/30 rounded-2xl p-4 mb-4">
            <textarea
              value={newQuoteText}
              onChange={e => setNewQuoteText(e.target.value)}
              className="w-full bg-gray-900 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-red-600 resize-none mb-3"
              placeholder={isRTL ? 'نص الاقتباس...' : 'Quote text...'}
              rows={3}
            />
            <input
              type="text"
              value={newPageRef}
              onChange={e => setNewPageRef(e.target.value)}
              className="w-full bg-gray-900 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-red-600 mb-3"
              placeholder={isRTL ? 'الصفحة / المرجع' : 'Page / Reference'}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-gray-400 font-bold uppercase tracking-widest text-xs">
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button onClick={handleAdd} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold uppercase tracking-widest text-xs">
                {isRTL ? 'إضافة' : 'Add'}
              </button>
            </div>
          </MotionDiv>
        )}

        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin text-red-600" size={32} /></div>
        ) : quotes.length === 0 ? (
          <div className="text-center text-gray-500 mt-10 uppercase tracking-widest text-sm">
            {isRTL ? 'لا توجد اقتباسات بعد' : 'No quotes yet'}
          </div>
        ) : (
          quotes.map(quote => (
            <MotionDiv key={quote._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <Quote size={40} className="absolute top-4 right-4 text-red-900/20 opacity-20" />
              <p className="text-lg italic font-serif leading-relaxed mb-4 relative z-10 text-gray-200">
                "{quote.quoteText}"
              </p>
              <div className="flex items-center justify-between border-t border-gray-800 pt-4 mt-2">
                <div className="flex items-center gap-2">
                  <img src={quote.authorProfile?.avatarUrl || '/default-avatar.png'} alt="" className="w-6 h-6 rounded-full" />
                  <span className="text-xs text-red-500 font-black uppercase tracking-widest">{quote.authorProfile?.nickname}</span>
                </div>
                <div className="flex items-center gap-3">
                  {quote.pageReference && <span className="text-xs text-gray-500 bg-black/50 px-2 py-1 rounded">p. {quote.pageReference}</span>}
                  {quote.userId === userProfile.userId && (
                    <button onClick={() => handleDelete(quote._id)} className="text-gray-600 hover:text-red-500"><Trash2 size={16} /></button>
                  )}
                </div>
              </div>
            </MotionDiv>
          ))
        )}
      </div>
    </div>
  );
}
