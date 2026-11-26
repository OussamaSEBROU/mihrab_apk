// ══════════════════════════════════════════════════════════════
// CLUB BOOKS SECTION — كتب المنافسة داخل النادي (عدة كتب لنفس النادي)
// ══════════════════════════════════════════════════════════════

import React, { useEffect, useState, useCallback } from 'react';
import { BookOpen, Plus, Trash2, Trophy, Loader2, ChevronDown, X } from 'lucide-react';
import type { ReadingClub } from '../../types/readingClub';
import type { ClubBookEntry, ChallengeParticipant } from '../../types/challenge';
import { challengeService } from '../../services/challengeService';

interface Props {
  lang: 'ar' | 'en';
  club: ReadingClub;
  /** مالك أو مشرف */
  canManage: boolean;
  /** مكتبة المستخدم لاختيار كتاب منها (اختياري) */
  books?: any[];
}

export default function ClubBooksSection({ lang, club, canManage, books }: Props) {
  const isRTL = lang === 'ar';
  const isChallengeGroup = (club.description || '').startsWith('منافسة كتاب:');

  const [entries, setEntries] = useState<ClubBookEntry[]>(() => challengeService.getCachedClubBooks(club._id));
  const [boards, setBoards] = useState<Record<string, ChallengeParticipant[]>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await challengeService.getClubBooks(club._id);
      setEntries(list);
      if (list.length) setBoards(await challengeService.fetchClubBoards(club._id, list.map(b => b.key)));
    } finally { setLoading(false); }
  }, [club._id]);

  useEffect(() => { if (!isChallengeGroup) load(); else setLoading(false); }, [load, isChallengeGroup]);

  if (isChallengeGroup) return null;

  const handleAdd = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      const next = await challengeService.addClubBook(club._id, title, author);
      setEntries(next);
      setTitle(''); setAuthor(''); setAdding(false);
    } finally { setBusy(false); }
  };

  const handleRemove = async (key: string) => {
    setBusy(true);
    try { setEntries(await challengeService.removeClubBook(club._id, key)); }
    finally { setBusy(false); setConfirmKey(null); }
  };

  const library = (books || []).filter(b => b && b.title);

  return (
    <div className="bg-amber-900/10 border border-amber-700/30 rounded-xl p-4 space-y-3" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-black uppercase tracking-widest text-amber-400">
            {isRTL ? 'كتب المنافسة' : 'Challenge Books'}
          </span>
          <span className="text-[10px] font-bold text-white/30">({entries.length})</span>
        </div>
        {canManage && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-3 h-9 rounded-full bg-amber-600/20 border border-amber-600/30 text-amber-400 text-[11px] font-black"
          >
            <Plus size={14} />{isRTL ? 'إضافة كتاب' : 'Add book'}
          </button>
        )}
      </div>

      {adding && (
        <div className="bg-black/40 border border-white/10 rounded-xl p-3 space-y-2">
          {library.length > 0 && (
            <select
              defaultValue=""
              onChange={e => {
                const b = library.find(x => String(x.id) === e.target.value);
                if (b) { setTitle(b.title || ''); setAuthor(b.author || ''); }
              }}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white font-bold"
            >
              <option value="" className="bg-black">{isRTL ? 'اختر من مكتبتي…' : 'Pick from my library…'}</option>
              {library.map(b => <option key={b.id} value={b.id} className="bg-black">{b.title}</option>)}
            </select>
          )}
          <input
            value={title} onChange={e => setTitle(e.target.value)}
            placeholder={isRTL ? 'عنوان الكتاب' : 'Book title'}
            className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white font-bold placeholder-white/30"
          />
          <input
            value={author} onChange={e => setAuthor(e.target.value)}
            placeholder={isRTL ? 'المؤلف (اختياري)' : 'Author (optional)'}
            className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white font-bold placeholder-white/30"
          />
          <div className="flex gap-2">
            <button onClick={() => { setAdding(false); setTitle(''); setAuthor(''); }}
              className="flex-1 h-10 rounded-lg bg-white/5 border border-white/10 text-white/60 text-xs font-black">
              {isRTL ? 'إلغاء' : 'Cancel'}
            </button>
            <button onClick={handleAdd} disabled={busy || !title.trim()}
              className="flex-[2] h-10 rounded-lg bg-amber-600 text-white text-xs font-black disabled:opacity-40 flex items-center justify-center gap-2">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {isRTL ? 'إضافة للمنافسة' : 'Add to challenges'}
            </button>
          </div>
        </div>
      )}

      {loading && entries.length === 0 ? (
        <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-amber-500" /></div>
      ) : entries.length === 0 ? (
        <p className="text-[11px] font-bold text-white/30 text-center py-2 leading-relaxed">
          {canManage
            ? (isRTL ? 'لا توجد كتب بعد. أضف كتاباً ليتنافس عليه أعضاء النادي.' : 'No books yet. Add one for members to compete on.')
            : (isRTL ? 'لم يضف المشرف كتباً للمنافسة بعد.' : 'No challenge books yet.')}
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map(b => {
            const list = boards[b.key] || [];
            const isOpen = open === b.key;
            return (
              <div key={b.key} className="bg-black/40 border border-white/10 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 p-3">
                  <button onClick={() => setOpen(isOpen ? null : b.key)} className="flex items-center gap-3 min-w-0 flex-1 text-start">
                    <BookOpen className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-white truncate">{b.title}</span>
                      <span className="block text-[10px] font-bold text-white/35 truncate">
                        {b.author ? `${b.author} · ` : ''}{list.length} {isRTL ? 'متنافس' : 'competitors'}
                        {list[0] ? ` · 👑 ${list[0].name}` : ''}
                      </span>
                    </span>
                    <ChevronDown size={16} className={`text-white/30 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {canManage && (
                    confirmKey === b.key ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => handleRemove(b.key)} disabled={busy}
                          className="h-9 px-3 rounded-lg bg-red-600 text-white text-[11px] font-black">{isRTL ? 'احذف' : 'Remove'}</button>
                        <button onClick={() => setConfirmKey(null)} className="w-9 h-9 rounded-lg bg-white/5 text-white/50 flex items-center justify-center"><X size={14} /></button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmKey(b.key)} aria-label={isRTL ? 'إزالة' : 'Remove'}
                        className="w-9 h-9 shrink-0 rounded-lg bg-red-600/10 text-red-500 flex items-center justify-center"><Trash2 size={14} /></button>
                    )
                  )}
                </div>
                {isOpen && (
                  <div className="border-t border-white/5 px-3 py-2 space-y-1.5">
                    {list.length === 0 ? (
                      <p className="text-[10px] font-bold text-white/30 py-1">{isRTL ? 'لم يبدأ أحد بعد' : 'Nobody started yet'}</p>
                    ) : list.slice(0, 8).map((p, i) => (
                      <div key={p.userId} className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-white/70 truncate"><span className="text-white/30 tabular-nums">{i + 1}.</span> {p.name}</span>
                        <span className="text-white tabular-nums shrink-0">{p.score} <span className="text-white/30">{isRTL ? 'نقطة' : 'pts'}</span> · {p.percentComplete}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <p className="text-[9px] font-bold text-white/25 leading-relaxed">
        {isRTL
          ? 'لكل كتاب منافسته المستقلة. ينضم الأعضاء من نافذة «منافسة الكتاب» داخل القارئ عند فتح الكتاب نفسه.'
          : 'Each book has its own competition. Members join from the Book Challenge window in the reader.'}
      </p>
    </div>
  );
}
