import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Quote, Plus, Loader2, Trash2, AlertCircle } from 'lucide-react';
import { ReadingClub, ClubUserProfile } from '../../types/readingClub';
import { clubQuotesAPI } from '../../services/readingClubAPI';

const MotionDiv = motion.div as any;
const AVATARS = ['📖','🌙','⭐','🔥','🌿','💎','🦋','🌸','🏔️','🌊','🎭','🕌'];

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newQuoteText, setNewQuoteText] = useState('');
  const [newPageRef, setNewPageRef] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const res = await clubQuotesAPI.list(club._id);
      if (res.ok && res.data?.quotes) {
        setQuotes(res.data.quotes);
      } else {
        setQuotes([]);
      }
    } catch (err) {
      console.error(err);
      setError(isRTL ? 'حدث خطأ أثناء تحميل الاقتباسات' : 'Error loading quotes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [club._id]);

  const handleAdd = async () => {
    if (!newQuoteText.trim()) return;
    setIsSubmitting(true);
    setError('');
    try {
      await clubQuotesAPI.add(club._id, { 
        quoteText: newQuoteText, 
        pageReference: newPageRef ? parseInt(newPageRef, 10) || undefined : undefined 
      });
      setNewQuoteText('');
      setNewPageRef('');
      setIsAdding(false);
      load();
    } catch (err) {
      console.error(err);
      setError(isRTL ? 'حدث خطأ أثناء إضافة الاقتباس' : 'Error adding quote');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await clubQuotesAPI.delete(club._id, id);
      setQuotes(prev => prev.filter(q => q._id !== id));
    } catch (err) {
      console.error(err);
      setError(isRTL ? 'حدث خطأ أثناء حذف الاقتباس' : 'Error deleting quote');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#000a00] text-white" dir={isRTL ? 'rtl' : 'ltr'}>
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
        {error && (
          <div className="bg-red-900/20 border border-red-600/50 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="text-red-500" size={24} />
            <p className="text-red-200 text-sm font-medium">{error}</p>
          </div>
        )}

        {isAdding && (
          <MotionDiv initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-red-900/10 border border-red-600/30 rounded-2xl p-4 mb-4">
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
              <button onClick={() => setIsAdding(false)} disabled={isSubmitting} className="px-4 py-2 text-gray-400 font-bold uppercase tracking-widest text-xs disabled:opacity-50">
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button onClick={handleAdd} disabled={isSubmitting} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold uppercase tracking-widest text-xs flex items-center gap-2 disabled:opacity-50">
                {isSubmitting && <Loader2 className="animate-spin" size={14} />}
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
          quotes.map(quote => {
            const avatarIdx = quote.authorId && typeof quote.authorId === 'object' ? quote.authorId.avatarIndex : 0;
            const quoteAuthorId = quote.authorId && typeof quote.authorId === 'object' ? quote.authorId._id : quote.authorId;
            const canDelete = quoteAuthorId === (userProfile.id || userProfile.serverUserId);
            
            return (
              <MotionDiv key={quote._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <Quote size={40} className="absolute top-4 right-4 text-red-900/20 opacity-20" />
                <p className="text-lg italic font-serif leading-relaxed mb-4 relative z-10 text-gray-200">
                  "{quote.quoteText}"
                </p>
                <div className="flex items-center justify-between border-t border-gray-800 pt-4 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-red-900/30 flex items-center justify-center text-xs">
                      {AVATARS[avatarIdx] || '📖'}
                    </div>
                    <span className="text-xs text-red-500 font-black uppercase tracking-widest">
                      {quote.authorNickname || (quote.authorId && typeof quote.authorId === 'object' ? quote.authorId.nickname : '')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {quote.pageReference && <span className="text-xs text-gray-500 bg-black/50 px-2 py-1 rounded">p. {quote.pageReference}</span>}
                    {canDelete && (
                      <button onClick={() => handleDelete(quote._id)} className="text-gray-600 hover:text-red-500"><Trash2 size={16} /></button>
                    )}
                  </div>
                </div>
              </MotionDiv>
            );
          })
        )}
      </div>
    </div>
  );
}
