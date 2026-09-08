import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Save, Trash2, Loader2, AlertCircle, BookOpen, Eye, EyeOff, X } from 'lucide-react';
import { ReadingClub, ClubUserProfile } from '../../types/readingClub';
import { clubGroupsAPI, clubBookAPI } from '../../services/readingClubAPI';
import ConfirmDialog from './shared/ConfirmDialog';

const MotionDiv = motion.div as any;

interface Props {
  lang: 'ar' | 'en';
  club: ReadingClub;
  userProfile: ClubUserProfile;
  isOwner: boolean;
  books: any[];
  onBack: () => void;
  onClubUpdated: (club: ReadingClub) => void;
  onClubDeleted: () => void;
}

export default function ClubSettings({ lang, club, userProfile, isOwner, books, onBack, onClubUpdated, onClubDeleted }: Props) {
  const isRTL = lang === 'ar';

  // Editable fields
  const [name, setName] = useState(club.name || '');
  const [description, setDescription] = useState(club.description || '');
  const [joinApprovalRequired, setJoinApprovalRequired] = useState(club.joinApprovalRequired ?? true);
  const [maxMembers, setMaxMembers] = useState(club.maxMembers || 70);
  const [bookVisible, setBookVisible] = useState(club.bookVisibleToMembers ?? true);
  const [bookReadable, setBookReadable] = useState(club.bookReadableByMembers ?? true);
  const [selectedBookId, setSelectedBookId] = useState(club.currentBookId || '');

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removingBook, setRemovingBook] = useState(false);

  const hasChanges = name !== (club.name || '') || 
    description !== (club.description || '') ||
    joinApprovalRequired !== (club.joinApprovalRequired ?? true) ||
    maxMembers !== (club.maxMembers || 70) ||
    bookVisible !== (club.bookVisibleToMembers ?? true) ||
    bookReadable !== (club.bookReadableByMembers ?? true);

  const handleSave = async () => {
    if (!name.trim()) {
      setError(isRTL ? 'اسم النادي مطلوب' : 'Club name is required');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await clubGroupsAPI.updateGroup(club._id, {
        name: name.trim(),
        description: description.trim(),
        joinApprovalRequired,
        maxMembers,
        bookVisibleToMembers: bookVisible,
        bookReadableByMembers: bookReadable,
      } as any);
      if (res.ok && res.data) {
        onClubUpdated(res.data);
        setSuccess(isRTL ? 'تم حفظ التغييرات' : 'Changes saved');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(res.error || (isRTL ? 'فشل حفظ التغييرات' : 'Failed to save'));
      }
    } catch (err) {
      setError(isRTL ? 'حدث خطأ في الاتصال' : 'Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleSetBook = async (bookId: string) => {
    if (!bookId) return;
    const book = books.find((b: any) => (b.id === bookId || b._id === bookId));
    if (!book) return;
    setSaving(true);
    setError('');
    try {
      const res = await clubBookAPI.set(club._id, {
        currentBookId: bookId,
        currentBookTitle: book.title,
        currentBookAuthor: book.author,
        bookVisibleToMembers: bookVisible,
        bookReadableByMembers: bookReadable,
      });
      if (res.ok) {
        const updated = { ...club, currentBookId: bookId, currentBookTitle: book.title, currentBookAuthor: book.author };
        onClubUpdated(updated as ReadingClub);
        setSelectedBookId(bookId);
        setSuccess(isRTL ? 'تم تحديث الكتاب' : 'Book updated');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(isRTL ? 'فشل تحديث الكتاب' : 'Failed to update book');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveBook = async () => {
    setRemovingBook(true);
    try {
      const res = await clubBookAPI.remove(club._id);
      if (res.ok) {
        const updated = { ...club, currentBookId: undefined, currentBookTitle: undefined, currentBookAuthor: undefined };
        onClubUpdated(updated as ReadingClub);
        setSelectedBookId('');
        setSuccess(isRTL ? 'تم إزالة الكتاب' : 'Book removed');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(isRTL ? 'فشل إزالة الكتاب' : 'Failed to remove book');
    } finally {
      setRemovingBook(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await clubGroupsAPI.deleteGroup(club._id);
      if (res.ok) {
        onClubDeleted();
      } else {
        setError(res.error || (isRTL ? 'فشل حذف النادي' : 'Failed to delete club'));
      }
    } catch (err) {
      setError(isRTL ? 'حدث خطأ في الاتصال' : 'Network error');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#000a00] text-white" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-red-900/30">
        <button onClick={onBack} className="text-red-600 p-2 hover:bg-red-900/20 rounded-full">
          {isRTL ? <ArrowRight size={24} /> : <ArrowLeft size={24} />}
        </button>
        <h1 className="font-black uppercase tracking-widest text-lg">{isRTL ? 'إعدادات النادي' : 'Club Settings'}</h1>
        <div className="w-10"></div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-8">
        {/* Error/Success */}
        {error && (
          <div className="bg-red-900/20 border border-red-600/50 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="text-red-500 shrink-0" size={20} />
            <p className="text-red-200 text-sm">{error}</p>
            <button onClick={() => setError('')} className="text-red-500 shrink-0"><X size={16} /></button>
          </div>
        )}
        {success && (
          <MotionDiv initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-green-900/20 border border-green-600/50 rounded-xl p-3 text-center text-green-400 text-sm font-bold">
            {success}
          </MotionDiv>
        )}

        {/* Club Name */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
            {isRTL ? 'اسم النادي' : 'CLUB NAME'}
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-red-500"
            maxLength={50}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
            {isRTL ? 'الوصف' : 'DESCRIPTION'}
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-red-500 resize-none"
            rows={3}
            maxLength={200}
          />
        </div>

        {/* Privacy (read-only) */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
            {isRTL ? 'الخصوصية' : 'PRIVACY'}
          </label>
          <div className="bg-black/50 border border-white/10 rounded-lg py-3 px-4 text-gray-400 text-sm">
            {club.privacy === 'private' ? (isRTL ? '🔒 خاص — بالدعوة فقط' : '🔒 Private — Invite only') :
             club.privacy === 'public' ? (isRTL ? '🌐 عام — أي شخص يمكنه الانضمام' : '🌐 Public — Anyone can join') :
             (isRTL ? '👤 شخصي' : '👤 Personal')}
          </div>
        </div>

        {/* Join Approval Toggle */}
        <label className="flex items-center justify-between cursor-pointer bg-black/30 border border-white/10 rounded-xl p-4">
          <span className="text-sm font-medium">{isRTL ? 'الموافقة على الانضمام مطلوبة' : 'Require join approval'}</span>
          <div className="relative">
            <input type="checkbox" checked={joinApprovalRequired} onChange={e => setJoinApprovalRequired(e.target.checked)} className="sr-only" />
            <div className={`block w-10 h-6 rounded-full transition-colors ${joinApprovalRequired ? 'bg-red-600' : 'bg-gray-600'}`}></div>
            <div className={`dot absolute top-1 ${isRTL ? 'right-1' : 'left-1'} bg-white w-4 h-4 rounded-full transition-transform ${joinApprovalRequired ? (isRTL ? '-translate-x-4' : 'translate-x-4') : ''}`}></div>
          </div>
        </label>

        {/* Max Members */}
        <div className="bg-black/30 border border-white/10 rounded-xl p-4">
          <div className="flex justify-between text-sm font-medium mb-2">
            <span>{isRTL ? 'الحد الأقصى للأعضاء' : 'Max Members'}</span>
            <span className="text-red-500 font-bold">{maxMembers}</span>
          </div>
          <input type="range" min="2" max="70" value={maxMembers} onChange={e => setMaxMembers(parseInt(e.target.value))} className="w-full accent-red-600" />
        </div>

        {/* Book Section */}
        <div className="border-t border-white/10 pt-6">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-4 flex items-center gap-2">
            <BookOpen size={14} />
            {isRTL ? 'إعدادات الكتاب' : 'BOOK SETTINGS'}
          </h3>

          {/* Current Book */}
          {club.currentBookTitle ? (
            <div className="bg-black/40 border border-white/10 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">{isRTL ? 'الكتاب الحالي' : 'CURRENT BOOK'}</p>
                  <p className="text-sm font-bold">{club.currentBookTitle}</p>
                  {club.currentBookAuthor && <p className="text-xs text-gray-500 mt-1">{club.currentBookAuthor}</p>}
                </div>
                <button onClick={handleRemoveBook} disabled={removingBook} className="text-red-500 hover:bg-red-900/20 p-2 rounded-lg disabled:opacity-50">
                  {removingBook ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                {isRTL ? 'اختر كتاباً من مكتبتك' : 'SELECT A BOOK FROM YOUR LIBRARY'}
              </label>
              <select
                value={selectedBookId}
                onChange={e => { setSelectedBookId(e.target.value); if (e.target.value) handleSetBook(e.target.value); }}
                className="w-full bg-black/50 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-red-500 appearance-none"
              >
                <option value="">{isRTL ? '-- بدون كتاب --' : '-- No book --'}</option>
                {books.map((book: any) => (
                  <option key={book.id || book._id} value={book.id || book._id}>{book.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Book Visibility Toggle */}
          <label className="flex items-center justify-between cursor-pointer bg-black/30 border border-white/10 rounded-xl p-4 mb-3">
            <div className="flex items-center gap-2">
              <Eye size={16} className="text-gray-400" />
              <span className="text-sm font-medium">{isRTL ? 'إظهار الكتاب للأعضاء' : 'Show book to members'}</span>
            </div>
            <div className="relative">
              <input type="checkbox" checked={bookVisible} onChange={e => setBookVisible(e.target.checked)} className="sr-only" />
              <div className={`block w-10 h-6 rounded-full transition-colors ${bookVisible ? 'bg-red-600' : 'bg-gray-600'}`}></div>
              <div className={`dot absolute top-1 ${isRTL ? 'right-1' : 'left-1'} bg-white w-4 h-4 rounded-full transition-transform ${bookVisible ? (isRTL ? '-translate-x-4' : 'translate-x-4') : ''}`}></div>
            </div>
          </label>

          {/* Book Readable Toggle */}
          <label className="flex items-center justify-between cursor-pointer bg-black/30 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-gray-400" />
              <span className="text-sm font-medium">{isRTL ? 'السماح بقراءة الكتاب' : 'Allow reading book'}</span>
            </div>
            <div className="relative">
              <input type="checkbox" checked={bookReadable} onChange={e => setBookReadable(e.target.checked)} className="sr-only" />
              <div className={`block w-10 h-6 rounded-full transition-colors ${bookReadable ? 'bg-red-600' : 'bg-gray-600'}`}></div>
              <div className={`dot absolute top-1 ${isRTL ? 'right-1' : 'left-1'} bg-white w-4 h-4 rounded-full transition-transform ${bookReadable ? (isRTL ? '-translate-x-4' : 'translate-x-4') : ''}`}></div>
            </div>
          </label>
        </div>

        {/* Save Button */}
        {hasChanges && (
          <MotionDiv initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <button onClick={handleSave} disabled={saving || !name.trim()} className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {isRTL ? 'حفظ التغييرات' : 'SAVE CHANGES'}
            </button>
          </MotionDiv>
        )}

        {/* Delete Club (Owner only) */}
        {isOwner && (
          <div className="border-t border-red-900/30 pt-6 mt-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-4">
              {isRTL ? 'منطقة الخطر' : 'DANGER ZONE'}
            </h3>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-3 bg-red-900/20 hover:bg-red-900/40 text-red-500 border border-red-900/50 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Trash2 size={16} />
              {isRTL ? 'حذف النادي نهائياً' : 'DELETE CLUB PERMANENTLY'}
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirm Dialog */}
      {showDeleteConfirm && (
        <ConfirmDialog
          lang={lang}
          kind="delete"
          title={isRTL ? 'حذف النادي؟' : 'Delete Club?'}
          operationLabel={isRTL ? `حذف "${club.name}" نهائياً` : `Permanently delete "${club.name}"`}
          consequencesLabel={isRTL ? 'سيتم حذف جميع الرسائل والاقتباسات والمراحل' : 'All messages, quotes, and stages will be deleted'}
          permanenceLabel={isRTL ? 'لا يمكن التراجع عن هذا الإجراء' : 'This action cannot be undone'}
          confirmPhrase={club.name}
          loading={deleting}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
