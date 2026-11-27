// ══════════════════════════════════════════════════════════════
// BOOK SEARCH — بحث سريع عن كتاب بالاسم في واجهة المحراب الأساسية
// أيقونة صغيرة شفافة بلا إطار تذوب في الشريط العلوي (لا تمسّ هوية الواجهة)، وعند الاختيار ينتقل الرف إلى الكتاب مباشرة.
// ══════════════════════════════════════════════════════════════

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, BookOpen } from 'lucide-react';

interface Props {
  lang: 'ar' | 'en';
  books: { id: string; title: string; author?: string; shelfId: string }[];
  shelves: { id: string; name: string }[];
  onGoToBook: (book: any) => void;
  onHaptic?: () => void;
}

const norm = (t: string) =>
  (t || '')
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();

const BookSearch: React.FC<Props> = ({ lang, books, shelves, onGoToBook, onHaptic }) => {
  const isRTL = lang === 'ar';
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(id);
  }, [open]);

  const results = useMemo(() => {
    const n = norm(q);
    if (!n) return books.slice(0, 30);
    const words = n.split(' ');
    return books
      .filter(b => {
        const hay = norm(`${b.title} ${b.author || ''}`);
        return words.every(w => hay.includes(w));
      })
      .slice(0, 50);
  }, [q, books]);

  const close = () => { setOpen(false); setQ(''); };

  return (
    <>
      <button
        onClick={() => { setOpen(true); onHaptic?.(); }}
        aria-label={isRTL ? 'بحث عن كتاب' : 'Search books'}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-90"
        style={{ background: 'transparent' }}
      >
        <Search size={14} strokeWidth={2.2} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[9800] bg-black/85 backdrop-blur-md flex flex-col pointer-events-auto"
          dir={isRTL ? 'rtl' : 'ltr'}
          onClick={close}
        >
          <div className="w-full max-w-xl mx-auto px-4 pt-5 pb-3 flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <div className="flex-1 flex items-center gap-2 h-12 px-4 rounded-2xl bg-white/[0.07] border border-white/10">
              <Search size={16} className="text-white/40 shrink-0" />
              <input
                ref={inputRef}
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && results[0]) { onGoToBook(results[0]); close(); } }}
                placeholder={isRTL ? 'ابحث عن كتاب باسمه…' : 'Search a book by name…'}
                enterKeyHint="search"
                autoComplete="off"
                spellCheck={false}
                className="flex-1 bg-transparent outline-none text-sm font-bold text-white placeholder-white/30 min-w-0"
              />
              {q && (
                <button onClick={() => setQ('')} aria-label="clear" className="text-white/40 shrink-0"><X size={14} /></button>
              )}
            </div>
            <button
              onClick={close}
              aria-label={isRTL ? 'إغلاق' : 'Close'}
              className="w-12 h-12 shrink-0 rounded-2xl bg-white/5 border border-white/10 text-white/60 flex items-center justify-center"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto w-full max-w-xl mx-auto px-4 pb-8 space-y-2 overscroll-contain" onClick={e => e.stopPropagation()}>
            {results.length === 0 ? (
              <p className="text-center text-white/30 text-xs font-black py-16">
                {isRTL ? 'لا يوجد كتاب بهذا الاسم' : 'No book matches'}
              </p>
            ) : results.map(b => (
              <button
                key={b.id}
                onClick={() => { onGoToBook(b); close(); }}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] active:bg-white/10 text-start transition-colors"
              >
                <span className="w-9 h-9 rounded-xl bg-red-600/15 border border-red-600/25 flex items-center justify-center shrink-0">
                  <BookOpen size={15} className="text-red-400" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black text-white truncate">{b.title}</span>
                  <span className="block text-[10px] font-bold text-white/35 truncate">
                    {b.author ? `${b.author} · ` : ''}{shelves.find(s => s.id === b.shelfId)?.name || ''}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default React.memo(BookSearch);
