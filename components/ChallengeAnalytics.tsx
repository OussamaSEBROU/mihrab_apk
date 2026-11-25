// ══════════════════════════════════════════════════════════════
// CHALLENGE ANALYTICS — تحليل إنجازات المتنافسين (لوحة التحليل الذكي)
// • منحنيات زمنية دقيقة لكل متنافس (استيفاء Monotone Cubic — لا تجاوز ولا تذبذب كاذب)
// • مؤشّر لمس/تمرير يقرأ قيمة الجميع في اللحظة نفسها
// • تحليل إحصائي: متوسط، وسيط، انحراف معياري، فجوة الصدارة، ترتيبك ونسبتك المئوية،
//   وتيرة كل متنافس (انحدار خطي)، مكسب 7 أيام، الأيام النشطة، الانتظام، والتاريخ المتوقع لإنهاء الكتاب
// يظهر القسم فقط إذا كان لديك منافسة واحدة على الأقل.
// ══════════════════════════════════════════════════════════════

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Trophy, RefreshCw, TrendingUp, Activity, Crown } from 'lucide-react';
import type { Language } from '../types';
import type { BookChallenge, ChallengeParticipant, ChallengePoint } from '../types/challenge';
import { challengeService } from '../services/challengeService';
import { readingClubAuth } from '../services/readingClubAuth';

type Metric = 'score' | 'minutes' | 'percent';

const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#ef4444', '#a3e635'];
const DAY = 86400000;
const W = 600, H = 240, PL = 38, PR = 14, PT = 14, PB = 26;

// ───────── Math helpers ─────────
const pick = (pt: ChallengePoint, m: Metric) => (m === 'score' ? pt.sc : m === 'minutes' ? pt.m : pt.p);
const current = (p: ChallengeParticipant, m: Metric) => (m === 'score' ? p.score : m === 'minutes' ? p.readingMinutes : p.percentComplete);
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const median = (a: number[]) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const stdev = (a: number[]) => {
  if (a.length < 2) return 0;
  const mu = mean(a);
  return Math.sqrt(a.reduce((x, y) => x + (y - mu) ** 2, 0) / a.length);
};
/** آخر ظهور بصيغة نسبية */
const ago = (t: number, ar: boolean): string => {
  const d = Math.max(0, Date.now() - t);
  const m = Math.floor(d / 60000);
  if (m < 2) return ar ? 'نشط الآن' : 'Active now';
  if (m < 60) return ar ? `قبل ${m} د` : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return ar ? `قبل ${h} س` : `${h}h ago`;
  const dd = Math.floor(h / 24);
  return ar ? `قبل ${dd} يوم` : `${dd}d ago`;
};
const fmt = (n: number, d = 1) => (Number.isFinite(n) ? (Math.abs(n) >= 100 ? Math.round(n).toString() : n.toFixed(d).replace(/\.0+$/, '')) : '—');

/** ميل الانحدار الخطي للقيمة مقابل الزمن (وحدة/يوم) */
const slopePerDay = (pts: ChallengePoint[], m: Metric): number | null => {
  if (pts.length < 2) return null;
  const xs = pts.map(p => p.t / DAY);
  const ys = pts.map(p => pick(p, m));
  const mx = mean(xs), my = mean(ys);
  let num = 0, den = 0;
  for (let i = 0; i < xs.length; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
  if (den < 1e-9) return null;
  return num / den;
};

/** قيمة المتنافس عند لحظة T (آخر قيمة معروفة) */
const valueAt = (pts: ChallengePoint[], T: number, m: Metric): number | null => {
  let v: number | null = null;
  for (const p of pts) { if (p.t <= T) v = pick(p, m); else break; }
  return v;
};

/** مسار Monotone Cubic (Fritsch–Carlson) */
const monotonePath = (pts: { x: number; y: number }[]): string => {
  const n = pts.length;
  if (n === 0) return '';
  if (n === 1) return `M ${pts[0].x} ${pts[0].y}`;
  const dx: number[] = [], m: number[] = [], t: number[] = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1].x - pts[i].x;
    m[i] = dx[i] === 0 ? 0 : (pts[i + 1].y - pts[i].y) / dx[i];
  }
  t[0] = m[0]; t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
    if (s > 9) { const tau = 3 / Math.sqrt(s); t[i] = tau * a * m[i]; t[i + 1] = tau * b * m[i]; }
  }
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C ${pts[i].x + h} ${pts[i].y + t[i] * h}, ${pts[i + 1].x - h} ${pts[i + 1].y - t[i + 1] * h}, ${pts[i + 1].x} ${pts[i + 1].y}`;
  }
  return d;
};

/** سلسلة المتنافس مرتبة وبها نقطة الحاضر على الأقل */
const seriesOf = (p: ChallengeParticipant): ChallengePoint[] => {
  const h = [...(p.history || [])].sort((a, b) => a.t - b.t);
  if (!h.length) return [{ t: p.lastUpdated, m: p.readingMinutes, p: p.percentComplete, s: p.stars, sc: p.score }];
  return h;
};

interface Props { lang: Language }

const ChallengeAnalytics: React.FC<Props> = ({ lang }) => {
  const isRTL = lang === 'ar';
  const [challenges, setChallenges] = useState<BookChallenge[]>(() => challengeService.getAll());
  const [selectedBookId, setSelectedBookId] = useState<string | null>(() => challengeService.getAll()[0]?.bookId || null);
  const [metric, setMetric] = useState<Metric>('score');
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hoverT, setHoverT] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const myId = useMemo(() => readingClubAuth.getLocalProfile()?.id || '', []);
  const svgRef = useRef<SVGSVGElement>(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const reload = useCallback(() => setChallenges([...challengeService.getAll()]), []);

  const refresh = useCallback(async (bookId: string | null) => {
    if (!bookId) return;
    setRefreshing(true);
    try { await challengeService.fetchLeaderboard(bookId); } catch { /* نبقي المحلي */ }
    if (alive.current) { reload(); setRefreshing(false); }
  }, [reload]);

  // جلب أحدث بيانات المنافسة المختارة عند فتح اللوحة أو تغيير الاختيار
  useEffect(() => { refresh(selectedBookId); }, [selectedBookId, refresh]);

  const challenge = useMemo(() => challenges.find(c => c.bookId === selectedBookId) || null, [challenges, selectedBookId]);
  const participants = useMemo(
    () => [...(challenge?.participants || [])].sort((a, b) => (b.score - a.score) || a.userId.localeCompare(b.userId)),
    [challenge]
  );
  const colorOf = useMemo(() => {
    const m = new Map<string, string>();
    participants.forEach((p, i) => m.set(p.userId, PALETTE[i % PALETTE.length]));
    return m;
  }, [participants]);

  const series = useMemo(() => participants.map(p => ({ p, pts: seriesOf(p) })), [participants]);
  const visible = useMemo(() => series.filter(s => !hidden.has(s.p.userId)), [series, hidden]);

  // ───────── Chart geometry ─────────
  const geo = useMemo(() => {
    let tMin = Infinity, tMax = -Infinity, vMax = 0;
    visible.forEach(({ pts }) => pts.forEach(pt => {
      tMin = Math.min(tMin, pt.t); tMax = Math.max(tMax, pt.t); vMax = Math.max(vMax, pick(pt, metric));
    }));
    if (!Number.isFinite(tMin)) { tMin = Date.now() - DAY; tMax = Date.now(); }
    if (tMax - tMin < 3600000) { tMin -= 1800000; tMax += 1800000; }
    const yMax = metric === 'percent' ? 100 : Math.max(10, Math.ceil(vMax * 1.15 / 5) * 5);
    const x = (t: number) => PL + ((t - tMin) / (tMax - tMin)) * (W - PL - PR);
    const y = (v: number) => H - PB - (v / yMax) * (H - PT - PB);
    return { tMin, tMax, yMax, x, y };
  }, [visible, metric]);

  const dateFmt = useMemo(() => new Intl.DateTimeFormat(isRTL ? 'ar-u-nu-latn' : 'en', { day: 'numeric', month: 'short' }), [isRTL]);
  const dateTimeFmt = useMemo(() => new Intl.DateTimeFormat(isRTL ? 'ar-u-nu-latn' : 'en', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }), [isRTL]);

  const onPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return;
    const px = ((e.clientX - r.left) / r.width) * W;
    const ratio = Math.min(1, Math.max(0, (px - PL) / (W - PL - PR)));
    setHoverT(geo.tMin + ratio * (geo.tMax - geo.tMin));
  };

  // ───────── Statistics ─────────
  const stats = useMemo(() => {
    const vals = participants.map(p => current(p, metric));
    const n = vals.length;
    const mu = mean(vals), med = median(vals), sd = stdev(vals);
    const sorted = [...participants].sort((a, b) => current(b, metric) - current(a, metric));
    const leader = sorted[0];
    const second = sorted[1];
    const myIdx = sorted.findIndex(p => p.userId === myId);
    const me = myIdx >= 0 ? sorted[myIdx] : null;
    const now = Date.now();

    const rows = sorted.map((p, i) => {
      const pts = seriesOf(p);
      const spd = slopePerDay(pts, metric);
      const pctSlope = slopePerDay(pts, 'percent');
      const weekAgo = valueAt(pts, now - 7 * DAY, metric);
      const first = pick(pts[0], metric);
      const gain7 = current(p, metric) - (weekAgo ?? first);
      const days = new Set(pts.map(pt => new Date(pt.t).toDateString()));
      // انتظام: 1 - معامل التباين لمكاسب الأيام النشطة (يتطلب 3 أيام فأكثر)
      let consistency: number | null = null;
      if (days.size >= 3) {
        const perDay = new Map<string, number>();
        pts.forEach(pt => { const k = new Date(pt.t).toDateString(); perDay.set(k, Math.max(perDay.get(k) || 0, pick(pt, metric))); });
        const seq = Array.from(perDay.values());
        const gains = seq.slice(1).map((v, k) => Math.max(0, v - seq[k]));
        const gm = mean(gains);
        consistency = gm > 0 ? Math.max(0, Math.min(1, 1 - stdev(gains) / gm)) : null;
      }
      let eta: number | null = null;
      if (pctSlope && pctSlope > 0.01 && p.percentComplete < 100) eta = now + ((100 - p.percentComplete) / pctSlope) * DAY;
      return { p, rank: i + 1, value: current(p, metric), speed: spd, gain7, activeDays: days.size, consistency, eta, spanDays: (pts[pts.length - 1].t - pts[0].t) / DAY };
    });

    const percentile = me && n > 1 ? Math.round(((n - 1 - myIdx) / (n - 1)) * 100) : null;
    return {
      n, mu, med, sd, leader, second, me, myRank: myIdx + 1, percentile, rows,
      gapLeaderSecond: leader && second ? current(leader, metric) - current(second, metric) : 0,
      meVsMean: me ? current(me, metric) - mu : 0,
      meVsLeader: me && leader ? current(leader, metric) - current(me, metric) : 0,
    };
  }, [participants, metric, myId]);

  if (challenges.length === 0) return null;

  const unit = metric === 'percent' ? '%' : metric === 'minutes' ? (isRTL ? 'د' : 'm') : (isRTL ? 'ن' : 'pt');
  const metricLabel: Record<Metric, string> = {
    score: isRTL ? 'النقاط' : 'Score',
    minutes: isRTL ? 'الدقائق' : 'Minutes',
    percent: isRTL ? 'الإنجاز' : 'Progress',
  };

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => f * geo.yMax);
  const xTicks = [0, 1 / 3, 2 / 3, 1].map(f => geo.tMin + f * (geo.tMax - geo.tMin));
  const tile = 'rounded-2xl bg-black/30 border border-white/5 px-3 py-3 md:px-5 md:py-4';

  return (
    <section id="dash-competition" style={{ scrollMarginTop: 190 }} dir={isRTL ? 'rtl' : 'ltr'} className="bg-white/[0.01] border border-white/5 p-4 md:p-12 rounded-[1.5rem] md:rounded-[3.5rem] space-y-6 md:space-y-10 relative overflow-hidden shadow-3xl">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 md:gap-5 min-w-0">
          <div className="p-3 md:p-4 bg-amber-500/10 rounded-xl md:rounded-2xl border border-amber-500/20 shrink-0">
            <Trophy className="text-amber-400 size-5 md:size-8" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base md:text-4xl font-black tracking-tight italic truncate">
              {isRTL ? 'تحليل المنافسة' : 'Competition Analytics'}
            </h3>
            <p className="text-[9px] md:text-xs font-bold tracking-widest text-white/30 mt-1 truncate">
              {isRTL ? 'منحنيات الإنجاز والتحليل الإحصائي للمتنافسين' : 'Achievement curves & statistical analysis'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => refresh(selectedBookId)}
          aria-label={isRTL ? 'تحديث' : 'Refresh'}
          className="shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 active:bg-white/10"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ── Challenge selector ── */}
      {challenges.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
          {challenges.map(c => (
            <button
              key={c.bookId}
              type="button"
              onClick={() => { setSelectedBookId(c.bookId); setHidden(new Set()); setHoverT(null); }}
              className={`shrink-0 max-w-[200px] truncate px-4 py-2 rounded-full text-[10px] font-black border transition-colors ${
                c.bookId === selectedBookId ? 'bg-white text-black border-white' : 'bg-white/5 text-white/45 border-white/10'
              }`}
            >
              {c.bookTitle || c.bookId}
            </button>
          ))}
        </div>
      )}

      {/* ── Metric switch ── */}
      <div className="flex items-center gap-1.5 p-1 rounded-full bg-black/40 border border-white/5 w-fit">
        {(['score', 'minutes', 'percent'] as Metric[]).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => setMetric(m)}
            className={`px-4 py-1.5 rounded-full text-[10px] md:text-xs font-black transition-colors ${metric === m ? 'bg-amber-500 text-black' : 'text-white/40'}`}
          >
            {metricLabel[m]}
          </button>
        ))}
      </div>

      {participants.length === 0 ? (
        <p className="text-center text-white/25 py-12 text-xs font-black">{isRTL ? 'لا توجد بيانات متنافسين بعد' : 'No competitor data yet'}</p>
      ) : (
        <>
          {/* ── Curves ── */}
          <div className="rounded-2xl bg-black/30 border border-white/5 p-2 md:p-5">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              className="w-full h-[210px] md:h-[300px] select-none"
              style={{ touchAction: 'pan-y' }}
              onPointerMove={onPointer}
              onPointerDown={onPointer}
              onPointerLeave={() => setHoverT(null)}
            >
              {yTicks.map((v, i) => (
                <g key={i}>
                  <line x1={PL} x2={W - PR} y1={geo.y(v)} y2={geo.y(v)} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 4" />
                  <text x={PL - 6} y={geo.y(v) + 3} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.3)">{fmt(v, 0)}</text>
                </g>
              ))}
              {xTicks.map((t, i) => (
                <text key={i} x={geo.x(t)} y={H - 8} textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'} fontSize="9" fill="rgba(255,255,255,0.3)">
                  {dateFmt.format(t)}
                </text>
              ))}

              {visible.map(({ p, pts }) => {
                const color = colorOf.get(p.userId) || '#fff';
                const isMe = p.userId === myId;
                // نقاط فريدة بالزمن لضمان x تصاعدي
                const xy: { x: number; y: number }[] = [];
                pts.forEach(pt => {
                  const x = geo.x(pt.t), y = geo.y(pick(pt, metric));
                  if (!xy.length || x > xy[xy.length - 1].x + 0.01) xy.push({ x, y });
                  else xy[xy.length - 1] = { x, y };
                });
                const last = xy[xy.length - 1];
                return (
                  <g key={p.userId}>
                    <path d={monotonePath(xy)} fill="none" stroke={color} strokeWidth={isMe ? 3 : 2} strokeLinecap="round" strokeLinejoin="round" opacity={isMe ? 1 : 0.85} />
                    {last && <circle cx={last.x} cy={last.y} r={isMe ? 4.5 : 3.5} fill={color} stroke="#000" strokeWidth="1.5" />}
                  </g>
                );
              })}

              {hoverT !== null && (
                <g>
                  <line x1={geo.x(hoverT)} x2={geo.x(hoverT)} y1={PT} y2={H - PB} stroke="rgba(255,255,255,0.35)" strokeDasharray="2 3" />
                  {visible.map(({ p, pts }) => {
                    const v = valueAt(pts, hoverT, metric);
                    if (v === null) return null;
                    return <circle key={p.userId} cx={geo.x(hoverT)} cy={geo.y(v)} r="4" fill={colorOf.get(p.userId)} stroke="#000" strokeWidth="1.5" />;
                  })}
                </g>
              )}
            </svg>

            {/* قراءة المؤشّر */}
            <div className="px-2 pb-1 min-h-[26px] text-[10px] font-bold text-white/45 flex flex-wrap items-center gap-x-4 gap-y-1">
              {hoverT === null ? (
                <span className="text-white/25">{isRTL ? 'المس المنحنى أو مرّر إصبعك لقراءة القيم في أي لحظة' : 'Touch the chart to read values at any moment'}</span>
              ) : (
                <>
                  <span className="text-white/30">{dateTimeFmt.format(hoverT)}</span>
                  {visible.map(({ p, pts }) => {
                    const v = valueAt(pts, hoverT, metric);
                    return (
                      <span key={p.userId} className="flex items-center gap-1.5">
                        <i className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: colorOf.get(p.userId) }} />
                        <span className="text-white/70">{p.name}</span>
                        <b className="tabular-nums text-white">{v === null ? '—' : `${fmt(v)}${unit}`}</b>
                      </span>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* ── Legend (toggle) ── */}
          <div className="flex flex-wrap gap-2">
            {series.map(({ p }) => {
              const off = hidden.has(p.userId);
              return (
                <button
                  key={p.userId}
                  type="button"
                  onClick={() => setHidden(prev => { const n = new Set(prev); off ? n.delete(p.userId) : n.add(p.userId); return n; })}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black transition-opacity ${off ? 'opacity-35 border-white/5 bg-transparent' : 'border-white/10 bg-white/5'}`}
                >
                  <i className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: colorOf.get(p.userId) }} />
                  <span className="max-w-[110px] truncate">{p.name}</span>
                  <span className="text-[9px] font-bold text-white/30">{ago(p.lastUpdated, isRTL)}</span>
                  {p.userId === myId && <span className="text-amber-400">{isRTL ? 'أنت' : 'You'}</span>}
                </button>
              );
            })}
          </div>

          {/* ── Summary tiles ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-4">
            <div className={tile}>
              <p className="text-[9px] font-black text-white/35">{isRTL ? 'المتوسط' : 'Mean'}</p>
              <p className="text-lg md:text-2xl font-black tabular-nums mt-1">{fmt(stats.mu)}<span className="text-[10px] text-white/30 mx-1">{unit}</span></p>
            </div>
            <div className={tile}>
              <p className="text-[9px] font-black text-white/35">{isRTL ? 'الوسيط' : 'Median'}</p>
              <p className="text-lg md:text-2xl font-black tabular-nums mt-1">{fmt(stats.med)}<span className="text-[10px] text-white/30 mx-1">{unit}</span></p>
            </div>
            <div className={tile}>
              <p className="text-[9px] font-black text-white/35">{isRTL ? 'الانحراف المعياري' : 'Std. deviation'}</p>
              <p className="text-lg md:text-2xl font-black tabular-nums mt-1">{fmt(stats.sd)}<span className="text-[10px] text-white/30 mx-1">{unit}</span></p>
            </div>
            <div className={tile}>
              <p className="text-[9px] font-black text-white/35">{isRTL ? 'فجوة الصدارة (1 ↔ 2)' : 'Lead gap (1st ↔ 2nd)'}</p>
              <p className="text-lg md:text-2xl font-black tabular-nums mt-1">{fmt(stats.gapLeaderSecond)}<span className="text-[10px] text-white/30 mx-1">{unit}</span></p>
            </div>
          </div>

          {/* ── My position ── */}
          {stats.me && (
            <div className="rounded-2xl bg-amber-500/[0.07] border border-amber-500/20 p-4 md:p-6 flex flex-wrap items-center gap-x-8 gap-y-3">
              <div className="flex items-center gap-3">
                <Crown className="text-amber-400" size={20} />
                <div>
                  <p className="text-[9px] font-black text-amber-400/70">{isRTL ? 'ترتيبك' : 'Your rank'}</p>
                  <p className="text-xl font-black tabular-nums">{stats.myRank}<span className="text-xs text-white/30"> / {stats.n}</span></p>
                </div>
              </div>
              {stats.percentile !== null && (
                <div>
                  <p className="text-[9px] font-black text-white/35">{isRTL ? 'تتفوّق على' : 'You outperform'}</p>
                  <p className="text-xl font-black tabular-nums">{stats.percentile}%<span className="text-xs text-white/30"> {isRTL ? 'من المتنافسين' : 'of peers'}</span></p>
                </div>
              )}
              <div>
                <p className="text-[9px] font-black text-white/35">{isRTL ? 'مقارنة بالمتوسط' : 'vs. mean'}</p>
                <p className={`text-xl font-black tabular-nums ${stats.meVsMean >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{stats.meVsMean >= 0 ? '+' : ''}{fmt(stats.meVsMean)}{unit}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-white/35">{isRTL ? 'المسافة عن الصدارة' : 'Gap to leader'}</p>
                <p className="text-xl font-black tabular-nums">{stats.meVsLeader <= 0 ? (isRTL ? 'أنت المتصدّر' : 'Leading') : `${fmt(stats.meVsLeader)}${unit}`}</p>
              </div>
            </div>
          )}

          {/* ── Per-participant table ── */}
          <div className="overflow-x-auto no-scrollbar rounded-2xl border border-white/5">
            <table className="w-full min-w-[640px] text-[10px] md:text-xs">
              <thead>
                <tr className="text-white/35 font-black bg-black/30">
                  <th className="p-3 text-start">#</th>
                  <th className="p-3 text-start">{isRTL ? 'المتنافس' : 'Reader'}</th>
                  <th className="p-3 text-start">{metricLabel[metric]}</th>
                  <th className="p-3 text-start">{isRTL ? 'الوتيرة/يوم' : 'Pace/day'}</th>
                  <th className="p-3 text-start">{isRTL ? 'مكسب 7 أيام' : '7-day gain'}</th>
                  <th className="p-3 text-start">{isRTL ? 'أيام نشطة' : 'Active days'}</th>
                  <th className="p-3 text-start">{isRTL ? 'الانتظام' : 'Consistency'}</th>
                  <th className="p-3 text-start">{isRTL ? 'إنهاء متوقع' : 'Projected finish'}</th>
                </tr>
              </thead>
              <tbody>
                {stats.rows.map(r => (
                  <tr key={r.p.userId} className={`border-t border-white/5 ${r.p.userId === myId ? 'bg-amber-500/[0.06]' : ''}`}>
                    <td className="p-3 font-black tabular-nums text-white/50">{r.rank}</td>
                    <td className="p-3">
                      <span className="flex items-center gap-2 font-black">
                        <i className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: colorOf.get(r.p.userId) }} />
                        <span className="flex flex-col min-w-0">
                          <span className="truncate max-w-[120px]">{r.p.name}</span>
                          <span className={`text-[9px] font-bold ${Date.now() - r.p.lastUpdated < 600000 ? 'text-emerald-400' : 'text-white/30'}`}>
                            {ago(r.p.lastUpdated, isRTL)}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="p-3 font-black tabular-nums">{fmt(r.value)}{unit}</td>
                    <td className="p-3 tabular-nums text-white/70">{r.speed === null ? '—' : `${r.speed >= 0 ? '+' : ''}${fmt(r.speed)}${unit}`}</td>
                    <td className={`p-3 tabular-nums ${r.gain7 > 0 ? 'text-emerald-400' : 'text-white/40'}`}>{r.gain7 > 0 ? '+' : ''}{fmt(r.gain7)}{unit}</td>
                    <td className="p-3 tabular-nums text-white/70">{r.activeDays}</td>
                    <td className="p-3 tabular-nums text-white/70">{r.consistency === null ? '—' : `${Math.round(r.consistency * 100)}%`}</td>
                    <td className="p-3 tabular-nums text-white/70">{r.p.percentComplete >= 100 ? (isRTL ? 'أنهى' : 'Done') : r.eta ? dateFmt.format(r.eta) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="flex items-start gap-2 text-[9px] md:text-[10px] font-bold text-white/25 leading-relaxed">
            <Activity size={12} className="shrink-0 mt-0.5" />
            {isRTL
              ? 'الوتيرة تُحسب بالانحدار الخطي لسجل التقدّم، والانتظام يتطلب 3 أيام نشطة على الأقل، والإنهاء المتوقع يفترض استمرار الوتيرة الحالية. كلما تراكمت المزامنات صارت المنحنيات أدق.'
              : 'Pace is a linear-regression slope over each reader’s history; consistency needs ≥3 active days; projected finish assumes the current pace continues. Curves get sharper as syncs accumulate.'}
          </p>
        </>
      )}
    </section>
  );
};

export default React.memo(ChallengeAnalytics);
