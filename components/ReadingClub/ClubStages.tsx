import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Flag, Plus, Loader2, Edit3, Trash2, X, Save, AlertCircle } from 'lucide-react';
import { ReadingClub, ClubUserProfile } from '../../types/readingClub';
import { clubStagesAPI } from '../../services/readingClubAPI';
import ConfirmDialog from './shared/ConfirmDialog';

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
  const [error, setError] = useState('');

  // Add/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editStage, setEditStage] = useState<any>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalDesc, setModalDesc] = useState('');
  const [modalPageStart, setModalPageStart] = useState('');
  const [modalPageEnd, setModalPageEnd] = useState('');
  const [modalStatus, setModalStatus] = useState<'upcoming' | 'active' | 'completed'>('upcoming');
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteStageId, setDeleteStageId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      const res = await clubStagesAPI.list(club._id);
      setStages(res.data || []);
    } catch (err) {
      console.error(err);
      setError(isRTL ? 'حدث خطأ أثناء تحميل المراحل' : 'Error loading stages');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [club._id]);

  const openAddModal = () => {
    setEditStage(null);
    setModalTitle('');
    setModalDesc('');
    setModalPageStart('');
    setModalPageEnd('');
    setModalStatus('upcoming');
    setShowModal(true);
  };

  const openEditModal = (stage: any) => {
    setEditStage(stage);
    setModalTitle(stage.title || '');
    setModalDesc(stage.description || '');
    setModalPageStart(stage.pageStart?.toString() || '');
    setModalPageEnd(stage.pageEnd?.toString() || '');
    setModalStatus(stage.status || 'upcoming');
    setShowModal(true);
  };

  const handleSaveStage = async () => {
    if (!modalTitle.trim()) return;
    setSaving(true);
    setError('');
    try {
      const data: any = {
        title: modalTitle.trim(),
        description: modalDesc.trim() || undefined,
        pageStart: modalPageStart ? parseInt(modalPageStart, 10) : undefined,
        pageEnd: modalPageEnd ? parseInt(modalPageEnd, 10) : undefined,
        status: modalStatus,
      };
      if (editStage) {
        await clubStagesAPI.update(club._id, editStage._id, data);
      } else {
        data.orderIndex = stages.length;
        await clubStagesAPI.create(club._id, data);
      }
      setShowModal(false);
      load();
    } catch (err) {
      console.error(err);
      setError(isRTL ? 'حدث خطأ أثناء حفظ المرحلة' : 'Error saving stage');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStage = async () => {
    if (!deleteStageId) return;
    setDeleting(true);
    try {
      await clubStagesAPI.delete(club._id, deleteStageId);
      setStages(prev => prev.filter(s => s._id !== deleteStageId));
      setDeleteStageId(null);
    } catch (err) {
      console.error(err);
      setError(isRTL ? 'حدث خطأ أثناء حذف المرحلة' : 'Error deleting stage');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-900/30 text-blue-500 border-blue-500/30';
      case 'active': return 'bg-green-900/30 text-green-500 border-green-500/30';
      case 'completed': return 'bg-yellow-900/30 text-yellow-500 border-yellow-500/30';
      default: return 'bg-gray-900 text-gray-500 border-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      upcoming: isRTL ? 'قادمة' : 'UPCOMING',
      active: isRTL ? 'نشطة' : 'ACTIVE',
      completed: isRTL ? 'مكتملة' : 'COMPLETED',
    };
    return map[status] || status;
  };

  return (
    <div className="flex flex-col h-full bg-[#000a00] text-white" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between p-4 border-b border-red-900/30">
        <button onClick={onBack} className="text-red-600 p-2 hover:bg-red-900/20 rounded-full">
          {isRTL ? <ArrowRight size={24} /> : <ArrowLeft size={24} />}
        </button>
        <h1 className="font-black uppercase tracking-widest text-lg">{isRTL ? 'مراحل القراءة' : 'Reading Stages'}</h1>
        {isOwner ? (
          <button onClick={openAddModal} className="text-red-600 p-2 hover:bg-red-900/20 rounded-full">
            <Plus size={24} />
          </button>
        ) : <div className="w-10"></div>}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {error && (
          <div className="bg-red-900/20 border border-red-600/50 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="text-red-500" size={24} />
            <p className="text-red-200 text-sm font-medium">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin text-red-600" size={32} /></div>
        ) : stages.length === 0 ? (
          <div className="text-center text-gray-500 mt-10 uppercase tracking-widest text-sm">
            {isRTL ? 'لا توجد مراحل بعد' : 'No stages yet'}
          </div>
        ) : (
          <div className={`relative ${isRTL ? 'border-r-2 mr-4 pr-6' : 'border-l-2 ml-4 pl-6'} border-red-900/30 space-y-8 py-4`}>
            {stages.map((stage, i) => (
              <MotionDiv key={stage._id} initial={{ opacity: 0, x: isRTL ? 20 : -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="relative">
                <div className={`absolute ${isRTL ? '-right-[35px]' : '-left-[35px]'} top-4 w-4 h-4 bg-red-600 rounded-full border-4 border-[#000a00]`} />
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg text-white">{stage.title}</h3>
                    <div className={`text-[10px] font-black uppercase tracking-widest border rounded px-2 py-1 ${getStatusColor(stage.status)}`}>
                      {getStatusLabel(stage.status)}
                    </div>
                  </div>
                  {stage.description && <p className="text-sm text-gray-400 mb-3">{stage.description}</p>}
                  <div className="flex gap-4 text-xs font-black uppercase tracking-widest text-red-500 mb-4">
                    {stage.pageStart && stage.pageEnd && (
                      <span className="bg-red-900/20 px-2 py-1 rounded">{isRTL ? 'الصفحات' : 'Pages'}: {stage.pageStart} - {stage.pageEnd}</span>
                    )}
                  </div>
                  {isOwner && (
                    <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'} gap-2 border-t border-gray-800 pt-3 mt-2`}>
                      <button onClick={() => openEditModal(stage)} className="text-gray-500 hover:text-white"><Edit3 size={16} /></button>
                      <button onClick={() => setDeleteStageId(stage._id)} className="text-gray-500 hover:text-red-500"><Trash2 size={16} /></button>
                    </div>
                  )}
                </div>
              </MotionDiv>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
          <MotionDiv initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#0b140b] border border-white/10 rounded-3xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black uppercase tracking-widest text-red-500">
                {editStage ? (isRTL ? 'تعديل المرحلة' : 'Edit Stage') : (isRTL ? 'إضافة مرحلة' : 'Add Stage')}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <input value={modalTitle} onChange={e => setModalTitle(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-red-500" placeholder={isRTL ? 'عنوان المرحلة' : 'Stage title'} />
              <textarea value={modalDesc} onChange={e => setModalDesc(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-red-500 resize-none" placeholder={isRTL ? 'وصف (اختياري)' : 'Description (optional)'} rows={2} />
              <div className="grid grid-cols-2 gap-3">
                <input value={modalPageStart} onChange={e => setModalPageStart(e.target.value)} type="number" className="bg-black/50 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-red-500" placeholder={isRTL ? 'من صفحة' : 'From page'} />
                <input value={modalPageEnd} onChange={e => setModalPageEnd(e.target.value)} type="number" className="bg-black/50 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-red-500" placeholder={isRTL ? 'إلى صفحة' : 'To page'} />
              </div>
              <select value={modalStatus} onChange={e => setModalStatus(e.target.value as any)} className="w-full bg-black/50 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-red-500 appearance-none">
                <option value="upcoming">{isRTL ? 'قادمة' : 'Upcoming'}</option>
                <option value="active">{isRTL ? 'نشطة' : 'Active'}</option>
                <option value="completed">{isRTL ? 'مكتملة' : 'Completed'}</option>
              </select>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} disabled={saving} className="flex-1 py-3 bg-white/5 text-gray-400 rounded-xl font-black uppercase text-xs">{isRTL ? 'إلغاء' : 'Cancel'}</button>
              <button onClick={handleSaveStage} disabled={saving || !modalTitle.trim()} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {isRTL ? 'حفظ' : 'Save'}
              </button>
            </div>
          </MotionDiv>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteStageId && (
        <ConfirmDialog
          lang={lang}
          kind="delete"
          title={isRTL ? 'حذف المرحلة؟' : 'Delete Stage?'}
          operationLabel={isRTL ? 'حذف هذه المرحلة نهائياً' : 'Permanently delete this stage'}
          consequencesLabel={isRTL ? 'سيتم حذف المرحلة من النادي' : 'The stage will be removed from the club'}
          permanenceLabel={isRTL ? 'لا يمكن التراجع عن هذا الإجراء' : 'This action cannot be undone'}
          loading={deleting}
          onCancel={() => setDeleteStageId(null)}
          onConfirm={handleDeleteStage}
        />
      )}
    </div>
  );
}
