// ══════════════════════════════════════════════════════════════
// WISDOM INDEX — فهرس الحكمة (Reader)
// تنظيم بصري للفصول/الصفحات + بحث + تصفية بالنوع + إظهار موضع القارئ الحالي
// أداء: صفوف مذكَّرة (memo) + content-visibility للتمرير السلس مهما كثرت الملاحظات
// ══════════════════════════════════════════════════════════════

import React, { useState, useMemo, useEffect, useRef, useDeferredValue, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Search, Edit3, Highlighter, Underline, BoxSelect, MessageSquare, MapPin } from 'lucide-react';
import type { Annotation, Language } from '../types';
import { translations } from '../i18n/translations';

const MotionDiv = motion.div as any;

type AnnoType = Annotation['type'];

const TYPE_META: Record<AnnoType, { icon: any; ar: string; en: string }> = {
  highlight: { icon: Highlighter, ar: 'تظليل', en: 'Highlight' },
  underline: { icon: Underline, ar: 'تسطير', en: 'Underline' },
  box: { icon: BoxSelect, ar: 'إطار', en: 'Frame' },
  note: { icon: MessageSquare, ar: 'ملاحظة', en: 'Note' },
};

// تطبيع عربي للبحث: إزالة التشكيل وتوحيد الألف والياء والتاء المربوطة
const norm = (v?: string) =>
  (v || '')
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .trim();

interface Group {
  key: string;
  label: string;
  page: number;       // أول صفحة في المجموعة (للتمرير لموضع القارئ)
  lastPage: number;
  items: Annotation[];
}

interface RowProps {
  anno: Annotation;
  isCurrent: boolean;
  showPage: boolean;
  isRTL: boolean;
  pageLabel: string;
  onGoTo: (page: number, id: string) => void;
  onEdit: (id: string) => void;
}

const IndexRow = React.memo(({ anno, isCurrent, showPage, isRTL, pageLabel, onGoTo, onEdit }: RowProps) => {
  const meta = TYPE_META[anno.type] || TYPE_META.note;
  const Icon = meta.icon;
  const title = (anno.title || '').trim();
  const note = (anno.text || '').trim();
  const heading = title || (note ? note : (isRTL ? `${meta.ar} بلا عنوان` : `Untitled ${meta.en.toLowerCase()}`));
  const showNote = !!title && !!note;
  return (
    <div
      data-current={isCurrent ? '1' : undefined}
      className={`relative flex items-stretch rounded-2xl border transition-colors overflow-hidden ${
        isCurrent ? 'bg-red-600/[0.07] border-red-600/30' : 'bg-white/[0.03] border-white/5 active:bg-white/[0.06]'
      }`}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 64px' } as React.CSSProperties}
    >
      <span className="w-1 shrink-0" style={{ backgroundColor: anno.color }} />
      <button
        type="button"
        onClick={() => onGoTo(anno.pageIndex, anno.id)}
        className="flex-1 min-w-0 px-3.5 py-3 flex items-start gap-3"
        style={{ textAlign: 'start' }}
      >
        <span
          className="mt-0.5 w-7 h-7 shrink-0 rounded-lg flex items-center justify-center border border-white/10"
          style={{ backgroundColor: `${anno.color}22`, color: anno.color }}
        >
          <Icon size={13} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 mb-0.5">
            {showPage && (
              <span className="text-[9px] font-black text-red-500 tracking-wide">{pageLabel} {anno.pageIndex + 1}</span>
            )}
            <span className="text-[9px] font-bold text-white/30">{isRTL ? meta.ar : meta.en}</span>
          </span>
          <span className={`block text-[12px] leading-snug font-bold ${title || note ? 'text-white/90' : 'text-white/35'}`} style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>
            {heading}
          </span>
          {showNote && (
            <span className="block mt-1 text-[10px] leading-snug font-medium text-white/40" style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>{note}</span>
          )}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onEdit(anno.id)}
        aria-label={isRTL ? 'تعديل' : 'Edit'}
        className="w-12 shrink-0 flex items-center justify-center text-white/30 active:text-white border-white/5"
        style={{ borderInlineStartWidth: 1, borderInlineStartStyle: 'solid' }}
      >
        <Edit3 size={14} />
      </button>
    </div>
  );
});

interface Props {
  lang: Language;
  annotations: Annotation[];
  currentPage: number;
  totalPages: number;
  onClose: () => void;
  onGoTo: (pageIndex: number, id: string) => void;
  onEdit: (id: string) => void;
}

const WisdomIndex: React.FC<Props> = ({ lang, annotations, currentPage, totalPages, onClose, onGoTo, onEdit }) => {
  const t = translations[lang];
  const isRTL = lang === 'ar';
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<AnnoType | 'all'>('all');
  const deferredQuery = useDeferredValue(query);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ترتيب ثابت: صفحة ← موضع رأسي ← موضع أفقي
  const sorted = useMemo(
    () => [...annotations].sort((a, b) => (a.pageIndex - b.pageIndex) || (a.y - b.y) || (a.x - b.x)),
    [annotations]
  );

  const typesPresent = useMemo(() => {
    const set = new Set<AnnoType>();
    sorted.forEach(a => set.add(a.type));
    return Array.from(set);
  }, [sorted]);

  const hasChapters = useMemo(() => sorted.some(a => (a.chapter || '').trim()), [sorted]);

  const filtered = useMemo(() => {
    const q = norm(deferredQuery);
    return sorted.filter(a => {
      if (typeFilter !== 'all' && a.type !== typeFilter) return false;
      if (!q) return true;
      return norm(a.title).includes(q) || norm(a.text).includes(q) || norm(a.chapter).includes(q) || String(a.pageIndex + 1) === q;
    });
  }, [sorted, deferredQuery, typeFilter]);

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>();
    const order: string[] = [];
    const uncategorized = isRTL ? 'بدون فصل' : 'No chapter';
    for (const a of filtered) {
      const chapter = (a.chapter || '').trim();
      const key = hasChapters ? `c:${chapter || '~'}` : `p:${a.pageIndex}`;
      let g = map.get(key);
      if (!g) {
        g = {
          key,
          label: hasChapters ? (chapter || uncategorized) : `${t.page} ${a.pageIndex + 1}`,
          page: a.pageIndex,
          lastPage: a.pageIndex,
          items: [],
        };
        map.set(key, g);
        order.push(key);
      }
      g.items.push(a);
      g.lastPage = Math.max(g.lastPage, a.pageIndex);
    }
    return order.map(k => map.get(k)!);
  }, [filtered, hasChapters, isRTL, t.page]);

  // المجموعة التي تحتوي موضع القارئ الحالي (أو الأقرب بعده)
  const currentGroupKey = useMemo(() => {
    if (groups.length === 0) return null;
    const exact = groups.find(g => g.items.some(a => a.pageIndex === currentPage));
    if (exact) return exact.key;
    const next = groups.find(g => g.page >= currentPage);
    return (next || groups[groups.length - 1]).key;
  }, [groups, currentPage]);

  const scrollToCurrent = useCallback((smooth: boolean) => {
    const root = scrollRef.current;
    if (!root || !currentGroupKey) return;
    const target =
      (root.querySelector('[data-current="1"]') as HTMLElement | null) ||
      (root.querySelector(`[data-group="${CSS.escape(currentGroupKey)}"]`) as HTMLElement | null);
    if (target) target.scrollIntoView({ block: 'center', behavior: smooth ? 'smooth' : 'auto' });
  }, [currentGroupKey]);

  // عند الفتح: ننتقل فوراً إلى موضع القارئ (مرة واحدة)
  const didInitialScroll = useRef(false);
  useEffect(() => {
    if (didInitialScroll.current || groups.length === 0) return;
    didInitialScroll.current = true;
    const id = requestAnimationFrame(() => scrollToCurrent(false));
    return () => cancelAnimationFrame(id);
  }, [groups.length, scrollToCurrent]);

  const showSearch = sorted.length > 6;
  const pageLabel = t.page as string;

  return (
    <MotionDiv
      key="archive"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[2000] bg-black/50 backdrop-blur-xl p-4 md:p-6 flex items-center justify-center pointer-events-auto"
      dir={isRTL ? 'rtl' : 'ltr'}
      onClick={onClose}
    >
      <MotionDiv
        initial={{ y: 40, opacity: 0.6 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        className="w-full max-w-xl max-h-[88vh] flex flex-col rounded-[2.25rem] border border-white/10 bg-[#0b140b]/90 backdrop-blur-2xl shadow-[0_30px_80px_rgba(0,0,0,0.7)] overflow-hidden"
      >
        {/* ── Header ── */}
        <div className="shrink-0 px-5 pt-5 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <h2 className="text-lg font-black italic tracking-tight text-white/80 truncate">{t.wisdomIndex}</h2>
              <span className="shrink-0 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-white/50">
                {annotations.length}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={isRTL ? 'إغلاق' : 'Close'}
              className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/60 active:bg-red-600/30"
            >
              <X size={16} />
            </button>
          </div>

          {/* موضع القارئ الحالي */}
          <div className="mt-3 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-red-600/[0.08] border border-red-600/20">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)]" />
              <span className="text-[10px] font-black text-red-400 truncate">
                {isRTL ? `أنت الآن في الصفحة ${currentPage + 1} من ${totalPages || '—'}` : `You are on page ${currentPage + 1} of ${totalPages || '—'}`}
              </span>
            </div>
            {groups.length > 0 && (
              <button
                type="button"
                onClick={() => scrollToCurrent(true)}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black text-white/70 active:bg-white/10"
              >
                <MapPin size={10} />
                {isRTL ? 'موضعي' : 'Locate'}
              </button>
            )}
          </div>

          {showSearch && (
            <div className="mt-3 relative">
              <Search size={13} className="absolute top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" style={{ insetInlineStart: 12 }} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isRTL ? 'ابحث في العناوين والملاحظات...' : 'Search titles and notes...'}
                className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-bold text-white outline-none focus:border-red-600/50 placeholder:text-white/20"
                style={{ paddingInlineStart: 36, paddingInlineEnd: 12 }}
              />
            </div>
          )}

          {typesPresent.length > 1 && (
            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {(['all', ...typesPresent] as (AnnoType | 'all')[]).map(tp => {
                const active = typeFilter === tp;
                const label = tp === 'all' ? (isRTL ? 'الكل' : 'All') : (isRTL ? TYPE_META[tp].ar : TYPE_META[tp].en);
                return (
                  <button
                    key={tp}
                    type="button"
                    onClick={() => setTypeFilter(tp)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black border transition-colors ${
                      active ? 'bg-white text-black border-white' : 'bg-white/5 text-white/40 border-white/10'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── List ── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scroll px-3 pb-4 overscroll-contain">
          {annotations.length === 0 ? (
            <p className="text-center text-white/25 py-20 font-black text-xs">{t.noAnnotations}</p>
          ) : groups.length === 0 ? (
            <p className="text-center text-white/25 py-16 font-black text-xs">{isRTL ? 'لا نتائج مطابقة' : 'No matching results'}</p>
          ) : (
            groups.map(g => {
              const isHere = g.key === currentGroupKey && g.items.some(a => a.pageIndex === currentPage);
              return (
                <section key={g.key} data-group={g.key} className="mb-3">
                  <div className="sticky top-0 z-10 -mx-3 px-5 py-2 bg-[#0b140b]/95 backdrop-blur-md flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full ${isHere ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)]' : 'bg-white/20'}`} />
                      <span className={`text-[11px] font-black truncate ${isHere ? 'text-red-400' : 'text-white/55'}`}>{g.label}</span>
                      {hasChapters && (
                        <span className="text-[9px] font-bold text-white/25 shrink-0">
                          {g.page === g.lastPage ? `${pageLabel} ${g.page + 1}` : `${pageLabel} ${g.page + 1}–${g.lastPage + 1}`}
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] font-black text-white/25">{g.items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {g.items.map(a => (
                      <IndexRow
                        key={a.id}
                        anno={a}
                        isCurrent={a.pageIndex === currentPage}
                        showPage={hasChapters}
                        isRTL={isRTL}
                        pageLabel={pageLabel}
                        onGoTo={onGoTo}
                        onEdit={onEdit}
                      />
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </div>
      </MotionDiv>
    </MotionDiv>
  );
};

export default WisdomIndex;
