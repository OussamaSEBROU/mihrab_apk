import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Flag, Plus, Loader2, Edit3, Trash2 } from 'lucide-react';
import { ReadingClub, ClubUserProfile } from '../../types/readingClub';
import { clubStagesAPI } from '../../services/readingClubAPI';

const MotionDiv = motion.div as any;

interface Props {
  lang: 'ar' | 'en';
  club: ReadingClub;
  userProfile: ClubUserProfile;
  isOwner: boolean;
  onBack: () => void;
}

export default function ClubStages({ lang, club, userProfile, isOwner, onBack }: Props) {
  const isRTL = lang === 'ar';
  const [stages, setStages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    try {
      const res = await clubStagesAPI.list(club._id);
      setStages(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [club._id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-900/30 text-blue-500 border-blue-500/30';
      case 'active': return 'bg-green-900/30 text-green-500 border-green-500/30';
      case 'completed': return 'bg-yellow-900/30 text-yellow-500 border-yellow-500/30';
      default: return 'bg-gray-900 text-gray-500 border-gray-800';
    }
  };

  return (
    <div className={`flex flex-col h-full bg-[#000a00] text-white ${isRTL ? 'dir-rtl' : 'dir-ltr'}`}>
      <div className="flex items-center justify-between p-4 border-b border-red-900/30">
        <button onClick={onBack} className="text-red-600 p-2 hover:bg-red-900/20 rounded-full">
          {isRTL ? <ArrowRight size={24} /> : <ArrowLeft size={24} />}
        </button>
        <h1 className="font-black uppercase tracking-widest text-lg">{isRTL ? 'مراحل القراءة' : 'Reading Stages'}</h1>
        {isOwner ? (
          <button className="text-red-600 p-2 hover:bg-red-900/20 rounded-full">
            <Plus size={24} />
          </button>
        ) : <div className="w-10"></div>}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin text-red-600" size={32} /></div>
        ) : stages.length === 0 ? (
          <div className="text-center text-gray-500 mt-10 uppercase tracking-widest text-sm">
            {isRTL ? 'لا توجد مراحل بعد' : 'No stages yet'}
          </div>
        ) : (
          <div className="relative border-l-2 border-red-900/30 ml-4 pl-6 space-y-8 py-4">
            {stages.map((stage, i) => (
              <MotionDiv key={stage._id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="relative">
                <div className="absolute -left-[35px] top-4 w-4 h-4 bg-red-600 rounded-full border-4 border-[#000a00]" />
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg text-white">{stage.title}</h3>
                    <div className={`text-[10px] font-black uppercase tracking-widest border rounded px-2 py-1 ${getStatusColor(stage.status)}`}>
                      {stage.status}
                    </div>
                  </div>
                  {stage.description && <p className="text-sm text-gray-400 mb-3">{stage.description}</p>}
                  <div className="flex gap-4 text-xs font-black uppercase tracking-widest text-red-500 mb-4">
                    {stage.pageStart && stage.pageEnd && (
                      <span className="bg-red-900/20 px-2 py-1 rounded">Pages: {stage.pageStart} - {stage.pageEnd}</span>
                    )}
                  </div>
                  {isOwner && (
                    <div className="flex justify-end gap-2 border-t border-gray-800 pt-3 mt-2">
                      <button className="text-gray-500 hover:text-white"><Edit3 size={16} /></button>
                      <button className="text-gray-500 hover:text-red-500"><Trash2 size={16} /></button>
                    </div>
                  )}
                </div>
              </MotionDiv>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
