
import React, { useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Sparkles, Trophy } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../i18n/translations';

interface CelebrationOverlayProps {
  starCount: number;
  lang: Language;
  onComplete: () => void;
}

const MotionDiv = motion.div as any;

const DEEP_QUOTES = {
  ar: [
    "«القراءة هي مخاض ثانٍ للعقل» — عباس محمود العقاد",
    "«لا تزال المعرفة هي القوة الوحيدة التي لا يمكن انتزاعها منك» — مجهول",
    "«الكتاب هو الجليس الذي لا يطريك، والصديق الذي لا يغريك» — الجاحظ",
    "«من يقرأ يعش ألف حياة قبل أن يموت» — جورج آر. آر. مارتن",
    "«العقل ليس وعاءً يجب ملؤه، بل ناراً يجب إيقادها» — بلوتارخ",
    "«الكتب هي الطائرات والقطارات والطرق، إنها الوجهة والرحلة» — آنا كويندلن",
    "«ما تقرأه يغير من أنت» — مجهول",
    "«المعرفة تبدأ بالدهشة» — أرسطو"
  ],
  en: [
    "\"Reading is a second birth for the mind.\" — Abbas Mahmoud al-Aqqad",
    "\"Knowledge is the only power that cannot be taken from you.\" — Anonymous",
    "\"A book is a companion that does not flatter you, and a friend that does not tempt you.\" — Al-Jahiz",
    "\"A reader lives a thousand lives before he dies.\" — George R.R. Martin",
    "\"The mind is not a vessel to be filled, but a fire to be kindled.\" — Plutarch",
    "\"Books are the plane, and the train, and the road. They are the destination, and the journey.\" — Anna Quindlen",
    "\"What you read changes who you are.\" — Anonymous",
    "\"Knowledge begins with wonder.\" — Aristotle"
  ]
};

export const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({ starCount, lang, onComplete }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const t = translations[lang];
  const quote = DEEP_QUOTES[lang][(starCount - 1) % DEEP_QUOTES[lang].length];

  // جسيمات ثابتة: تُولَّد مرة واحدة فقط (كانت Math.random داخل الرسم فتُعاد عشوائيتها
  // وتُعاد حركتها عند كل إعادة رسم للتطبيق، فيبدو اللوح مهتزاً)
  const particles = useMemo(() => Array.from({ length: 14 }, () => ({
    x: Math.round(Math.random() * 96),
    size: Math.round(Math.random() * 22 + 16),
    duration: Math.random() * 6 + 7,
    delay: Math.random() * 5,
  })), []);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = 0.5;
      audio.loop = false;
      audio.play().catch(e => console.warn("Celebration audio failed:", e));
    }
    
    const timer = setTimeout(() => {
      onComplete();
    }, 16000);

    return () => {
      clearTimeout(timer);
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [onComplete, starCount]);

  return (
    <MotionDiv
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 overflow-hidden"
      style={{ isolation: 'isolate', transform: 'translateZ(0)' }}
    >
      <audio ref={audioRef} src="/assets/sounds/celebration.mp3" />
        
        {/* Background particles (stable, 2D, GPU-only transforms) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((pt, i) => (
            <MotionDiv
              key={i}
              initial={{ y: '110vh', opacity: 0 }}
              animate={{ y: '-15vh', opacity: [0, 0.9, 0.9, 0] }}
              transition={{ duration: pt.duration, repeat: Infinity, delay: pt.delay, ease: 'linear' }}
              className="absolute text-red-500/40"
              style={{ left: `${pt.x}%`, top: 0, willChange: 'transform, opacity' }}
            >
              <Sparkles size={pt.size} />
            </MotionDiv>
          ))}
        </div>

        {/* Main 3D Card */}
        <MotionDiv
          key={starCount}
          initial={{ scale: 0.85, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 1.05, opacity: 0, y: -30 }}
          transition={{ type: "spring", damping: 24, stiffness: 140 }}
          className="relative z-10 flex flex-col items-center text-center p-10 md:p-16 w-[90vw] max-w-xl bg-black border border-white/10 rounded-[3rem] md:rounded-[5rem] shadow-[0_0_60px_rgba(255,0,0,0.18)]"
          style={{ willChange: 'transform, opacity' }}
        >
          {/* Floating 3D Trophy Container */}
          <MotionDiv
            animate={{ 
              y: [0, -10, 0]
            }}
            transition={{ 
              duration: 5, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="mb-10 relative"
          >
            <div className="absolute -inset-10 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.35) 0%, rgba(220,38,38,0) 65%)' }} />
            <div className="relative bg-gradient-to-br from-red-600 via-red-900 to-black p-8 md:p-12 rounded-[3rem] shadow-[0_20px_50px_rgba(255,0,0,0.4)] border border-red-400/30">
              <Trophy size={80} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
              <MotionDiv 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: "spring" }}
                className="absolute -top-4 -right-4 bg-white text-black w-14 h-14 rounded-full flex items-center justify-center font-black text-xl shadow-2xl border-4 border-red-600"
              >
                {starCount}
              </MotionDiv>
            </div>
          </MotionDiv>

          <MotionDiv
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="space-y-4"
          >
            <h2 className="text-4xl md:text-7xl font-black text-white uppercase tracking-tighter italic drop-shadow-2xl">
              {t.starAchieved}
            </h2>
            <div className="flex flex-col items-center gap-1">
              <span className="text-yellow-500 font-black text-lg md:text-2xl uppercase tracking-[0.2em] drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]">
                {t.badges[starCount - 1]}
              </span>
              <div className="h-1 w-24 bg-red-600 mx-auto rounded-full" />
            </div>
            <p className="text-base md:text-xl font-bold text-white/70 italic leading-relaxed max-w-md mx-auto px-4">
              {quote}
            </p>
          </MotionDiv>

          {/* 3D Star Row */}
          <MotionDiv
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-12 flex gap-3"
          >
            {[...Array(starCount)].map((_, i) => (
              <MotionDiv
                key={i}
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                whileHover={{ scale: 1.4, rotate: 20 }}
                transition={{ delay: 1.2 + i * 0.1, type: "spring" }}
              >
                <Star size={28} className="text-red-600 fill-red-600 drop-shadow-[0_0_10px_rgba(255,0,0,0.6)]" />
              </MotionDiv>
            ))}
          </MotionDiv>

          {/* Auto-close indicator */}
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 }}
            className="mt-12 w-full flex flex-col items-center gap-4"
          >
            <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
              <MotionDiv 
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 14, ease: "linear", delay: 2 }}
                className="h-full bg-red-600 shadow-[0_0_10px_#ff0000]"
              />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/25">
              {lang === 'ar' ? 'العودة إلى المحراب قريباً...' : 'Returning to sanctuary soon...'}
            </span>
          </MotionDiv>
        </MotionDiv>



      </MotionDiv>
  );
};