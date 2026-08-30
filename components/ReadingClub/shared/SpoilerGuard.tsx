import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye } from 'lucide-react';

const MotionDiv = motion.div as any;

interface SpoilerGuardProps {
  lang: 'ar' | 'en';
  children: React.ReactNode;
}

export default function SpoilerGuard({ lang, children }: SpoilerGuardProps) {
  const [revealed, setRevealed] = useState(false);
  const isRTL = lang === 'ar';
  
  const t = {
    spoiler: isRTL ? 'يحتوي على حرق' : 'Contains Spoiler',
    tapToReveal: isRTL ? 'انقر للكشف' : 'Tap to reveal'
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/5">
      <AnimatePresence>
        {!revealed && (
          <MotionDiv 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setRevealed(true)}
            className="absolute inset-0 z-10 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center cursor-pointer"
          >
            <Eye size={24} className="text-red-600 mb-2" />
            <p className="text-[10px] text-white font-black">{t.spoiler}</p>
            <p className="text-[7.5px] text-white/50 mt-1">{t.tapToReveal}</p>
          </MotionDiv>
        )}
      </AnimatePresence>
      <div className={!revealed ? 'filter blur-sm opacity-50' : 'transition-all duration-500'}>
        {children}
      </div>
    </div>
  );
}
