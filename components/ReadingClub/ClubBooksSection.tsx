// ══════════════════════════════════════════════════════════════
// CLUB BOOKS SECTION — كتب المنافسة داخل النادي (عدة كتب لنفس النادي)
// • المالك/المشرف: إضافة كتب (حتى بعد اختيار الكتاب الأول) وإزالتها
// • كل عضو: فتح الكتاب من مكتبته، الانضمام لمنافسته، أو الانسحاب منها بشكل مستقل لكل كتاب
// ══════════════════════════════════════════════════════════════

import React, { useEffect, useState, useCallback } from 'react';
import { BookOpen, Plus, Pencil, Trash2, Trophy, Loader2, ChevronDown, X, LogIn, LogOut, ExternalLink } from 'lucide-react';
import type { ReadingClub } from '../../types/readingClub';
import type { ClubBookEntry, ChallengeParticipant } from '../../types/challenge';
import { challengeService, titleMatches, entryMatches, makeBookKey } from '../../services/challengeService';

interface Props {
  lang: 'ar' | 'en';
  club: ReadingClub;
  /** مالك أو مشرف */
  canManage: boolean;
  /** مكتبة المستخدم */
  books?: any[];
  /** فتح كتاب من المكتبة في القارئ */
  onOpenBook?: (book: any) => void;
}

export default function ClubBooksSection({ lang, club, canManage, books, onOpenBook }: Props) {
  const isRTL = lang === 'ar';
  const isChallengeGroup = (club.description || '').startsWith('منافسة كتاب:');

  const [entries, setEntries] = useState<ClubBookEntry[]>(() => challengeService.getCachedClubBooks(club._id, club));
  const [boards, setBoards] = useState<Record<string, ChallengeParticipant[]>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState<string | null>(null);
  const [mine, setMine] = useState(() => challengeService.getMyClubParticipation(club._id));
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    try {
      if (canManage) await challengeService.registerCurrentBook(club._id, club).catch(() => {});
      const list = await challengeService.getClubBooks(club._id, club);
      setEntries(list);
      // المشرف: نُلحق بصمة محتوى كتبه المسجَّلة بلا بصمة ليتعرّف الأعضاء على الكتاب مهما اختلف اسم نسختهم
      if (canManage) {
        const ups = list
          .filter(e => !e.hash)
          .map(e => { const lb = (books || []).find((x: any) => x?.contentHash && x.title && titleMatches(x.title, e.title)); return lb ? { key: e.key, hash: lb.contentHash as string } : null; })
          .filter(Boolean) as { key: string; hash: string }[];
        if (ups.length) challengeService.setClubBookHashes(club._id, ups).then(() => challengeService.getClubBooks(club._id, club)).then(setEntries).catch(() => {});
      }
      if (list.length) setBoards(await challengeService.fetchClubBoards(club._id, list.map(b => b.key)));
      setMine(challengeService.getMyClubParticipation(club._id));
    } finally { setLoading(false); }
  }, [club, canManage, books]);

  useEffect(() => { if (!isChallengeGroup) load(); else setLoading(false); }, [load, isChallengeGroup]);

  if (isChallengeGroup) return null;

  const library = (books || []).filter(b => b && b.title);
  const findLibraryBook = (e: ClubBookEntry) => library.find(b => entryMatches(e, b.title, b.contentHash));
  const renameToOwner = (lib: any, e: ClubBookEntry) => {
    try { window.dispatchEvent(new CustomEvent('mihrab:rename-book', { detail: { id: lib.id, title: e.title } })); } catch { /* noop */ }
    flash(isRTL ? 'تمت إعادة تسمية كتابك' : 'Book renamed');
  };
  const participation = (e: ClubBookEntry) => mine.find(m => m.bookKey === e.key);
  const flash = (m: string) => { setNote(m); setTimeout(() => setNote(''), 3500); };

  const handleAdd = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      const picked = library.find(x => x.title === title.trim() || x.title === title);
      await challengeService.addClubBook(club._id, title, author, picked?.contentHash);
      setEntries(await challengeService.getClubBooks(club._id, club));
      setTitle(''); setAuthor(''); setAdding(false);
    } finally { setBusy(false); }
  };

  const handleRemove = async (key: string) => {
    setBusy(true);
    try {
      await challengeService.removeClubBook(club._id, key);
      setEntries(await challengeService.getClubBooks(club._id, club));
    } finally { setBusy(false); setConfirmKey(null); }
  };

  const handleJoin = async (e: ClubBookEntry) => {
    const lib = findLibraryBook(e);
    if (!lib) { flash(isRTL ? 'هذا الكتاب غير موجود في مكتبتك' : 'This book is not in your library'); return; }
    const identity = challengeService.getIdentity();
    if (!identity) {
      // لا هوية محفوظة بعد: نفتح الكتاب ليُكمل الانضمام من نافذة المنافسة
      onOpenBook?.(lib);
      return;
    }
    setBusy(true);
    try {
      const r = await challengeService.joinClubBook(identity, club, e, lib.id, lib.title, lib.author || '', canManage);
      if (r.success) { setMine(challengeService.getMyClubParticipation(club._id)); flash(isRTL ? 'انضممت للمنافسة' : 'Joined'); load(); }
      else flash(r.error || (isRTL ? 'تعذّر الانضمام' : 'Could not join'));
    } finally { setBusy(false); }
  };

  const handleLeave = async (e: ClubBookEntry) => {
    const p = participation(e);
    if (!p) return;
    setBusy(true);
    try {
      await challengeService.leaveChallenge(p.bookId);
      setMine(challengeService.getMyClubParticipation(club._id));
      flash(isRTL ? 'انسحبت من منافسة هذا الكتاب' : 'Left this book\'s challenge');
      load();
    } finally { setBusy(false); setConfirmLeave(null); }
  };

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

      {note && <p className="text-[11px] font-black text-amber-300 text-center">{note}</p>}

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
            const lib = findLibraryBook(b);
            const part = participation(b);
            return (
              <div key={b.key} className="bg-black/40 border border-white/10 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 p-3">
                  <button
                    onClick={() => (lib && onOpenBook ? onOpenBook(lib) : setOpen(isOpen ? null : b.key))}
                    className="flex items-center gap-3 min-w-0 flex-1 text-start"
                  >
                    <BookOpen className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm font-black text-white">
                        <span className="truncate">{b.title}</span>
                        {lib && onOpenBook && <ExternalLink size={11} className="text-white/30 shrink-0" />}
                      </span>
                      <span className="block text-[10px] font-bold text-white/35 truncate">
                        {b.author ? `${b.author} · ` : ''}{list.length} {isRTL ? 'متنافس' : 'competitors'}
                        {part ? (isRTL ? ' · أنت مشارك' : ' · joined') : ''}
                        {!lib ? (isRTL ? ' · ليس في مكتبتك' : ' · not in library') : ''}
                      </span>
                    </span>
                  </button>

                  <button onClick={() => setOpen(isOpen ? null : b.key)} aria-label={isRTL ? 'الصدارة' : 'Leaderboard'}
                    className="w-9 h-9 shrink-0 rounded-lg bg-white/5 text-white/40 flex items-center justify-center">
                    <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {part ? (
                    confirmLeave === b.key ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => handleLeave(b)} disabled={busy}
                          className="h-9 px-3 rounded-lg bg-red-600 text-white text-[11px] font-black whitespace-nowrap">{isRTL ? 'انسحاب' : 'Leave'}</button>
                        <button onClick={() => setConfirmLeave(null)} className="w-9 h-9 rounded-lg bg-white/5 text-white/50 flex items-center justify-center"><X size={14} /></button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmLeave(b.key)} aria-label={isRTL ? 'انسحاب' : 'Leave'}
                        className="w-9 h-9 shrink-0 rounded-lg bg-orange-600/10 border border-orange-600/25 text-orange-400 flex items-center justify-center">
                        <LogOut size={14} className={isRTL ? 'rotate-180' : ''} />
                      </button>
                    )
                  ) : (
                    <button onClick={() => handleJoin(b)} disabled={busy || !lib} aria-label={isRTL ? 'انضمام' : 'Join'}
                      className="w-9 h-9 shrink-0 rounded-lg bg-emerald-600/15 border border-emerald-600/30 text-emerald-400 flex items-center justify-center disabled:opacity-30">
                      <LogIn size={14} className={isRTL ? 'rotate-180' : ''} />
                    </button>
                  )}

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
                {lib && makeBookKey(lib.title) !== b.key && (
                  <div className="flex items-center gap-2 px-3 py-2 border-t border-amber-600/20 bg-amber-600/10">
                    <span className="flex-1 min-w-0 text-[10px] font-bold text-amber-300 leading-relaxed">
                      {isRTL
                        ? `تم التعرّف على كتابك لكنه مسمّى «${lib.title}» بينما اسمه عند المالك «${b.title}». سمِّه بالاسم نفسه لتجنّب اللبس.`
                        : `Your copy is recognised but named “${lib.title}”, the owner calls it “${b.title}”. Rename it to match.`}
                    </span>
                    <button onClick={() => renameToOwner(lib, b)}
                      className="shrink-0 h-8 px-3 rounded-lg bg-amber-600/25 border border-amber-500/40 text-amber-300 text-[10px] font-black flex items-center gap-1.5 whitespace-nowrap">
                      <Pencil size={11} />{isRTL ? 'إعادة التسمية' : 'Rename'}
                    </button>
                  </div>
                )}
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
          ? 'لكل كتاب منافسته المستقلة: اضغط الكتاب لفتحه، وزر الدخول للانضمام، وزر الخروج للانسحاب من هذا الكتاب فقط.'
          : 'Each book has its own challenge: tap a book to open it, use the join / leave buttons per book.'}
      </p>
    </div>
  );
}
