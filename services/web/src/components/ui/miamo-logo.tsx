'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import Image from 'next/image';

/* ═══════════════════════════════════════════════════════
   MIAMO LOGO SYSTEM — Pink Hearts
   Uses logo.png (cropped Miamo hearts logo with rounded corners)
   ═══════════════════════════════════════════════════════ */

interface AnimatedMiamoLogoProps {
  size?: number;
  showWordmark?: boolean;
  animated?: boolean;
  className?: string;
  variant?: 'full' | 'compact' | 'sidebar';
  onClick?: () => void;
}

export function AnimatedMiamoLogo({
  size = 36,
  showWordmark = false,
  animated = true,
  className = '',
  variant = 'full',
  onClick,
}: AnimatedMiamoLogoProps) {
  const [glowPulse, setGlowPulse] = useState(false);

  useEffect(() => {
    if (!animated) return;
    const t = setTimeout(() => setGlowPulse(true), 1200);
    return () => clearTimeout(t);
  }, [animated]);

  const iconSize = variant === 'compact' ? size * 0.85 : size;

  return (
    <div
      className={`flex items-center gap-2.5 select-none ${className}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <motion.div
        className="relative flex items-center justify-center"
        style={{ width: iconSize, height: iconSize }}
        whileHover={animated ? { scale: 1.06 } : undefined}
        whileTap={animated ? { scale: 0.94 } : undefined}
      >
        <motion.div
          className="absolute inset-[-4px] rounded-full"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(236,64,122,0.2), transparent 70%)',
          }}
          animate={glowPulse ? { opacity: [0.5, 1, 0.5] } : undefined}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="relative z-10 w-full h-full"
          initial={animated ? { opacity: 0, scale: 0.8 } : { opacity: 1, scale: 1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        >
          <Image
            src="/logo.png"
            alt="Miamo"
            width={Math.round(iconSize)}
            height={Math.round(iconSize)}
            className="w-full h-full object-contain"
            priority
          />
        </motion.div>
      </motion.div>
    </div>
  );
}

export function MiamoWordmark({
  className = '',
  animated = true,
}: {
  className?: string;
  animated?: boolean;
}) {
  return (
    <span className={`font-extrabold tracking-tight text-text-primary ${className}`}>
      Miamo
    </span>
  );
}

export function MiamoStaticWordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-extrabold tracking-tight ${className}`}>
      <span className="bg-gradient-to-r from-[#E91E63] to-[#D81B60] bg-clip-text text-transparent">M</span>
      <span className="text-text-primary">iamo</span>
    </span>
  );
}

export function MiamoCompactIcon({
  size = 28,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <AnimatedMiamoLogo
      size={size}
      showWordmark={false}
      animated={false}
      variant="compact"
      className={className}
    />
  );
}

export function MiamoSplash({
  onComplete,
  duration = 2800,
}: {
  onComplete?: () => void;
  duration?: number;
}) {
  const [phase, setPhase] = useState<'draw' | 'reveal' | 'done'>('draw');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('reveal'), 1200);
    const t2 = setTimeout(() => {
      setPhase('done');
      onComplete?.();
    }, duration);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [duration, onComplete]);

  return (
    <AnimatePresence>
      {phase !== 'done' && (
        <motion.div
          className="fixed inset-0 z-[9999] bg-miamo-bg flex items-center justify-center"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="absolute w-[400px] h-[400px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(236,64,122,0.12) 0%, transparent 70%)',
            }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="flex flex-col items-center gap-6">
            <motion.div
              className="relative w-24 h-24 flex items-center justify-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            >
              <Image
                src="/logo.png"
                alt="Miamo"
                width={96}
                height={96}
                className="w-full h-full object-contain"
                priority
              />
            </motion.div>
            <motion.p
              className="text-[11px] text-text-muted font-medium tracking-[0.2em] uppercase"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.6, duration: 0.5 }}
            >
              Find your person
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function MiamoFavicon({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} xmlns="http://www.w3.org/2000/svg" fill="none">
      <path d="M60 95 C60 75, 40 60, 25 60 C10 60, 0 75, 0 90 C0 120, 60 155, 60 155 C60 155, 60 120, 60 95Z"
        transform="translate(30, 25) scale(0.9)" fill="url(#fav-left)"/>
      <path d="M60 95 C60 75, 80 60, 95 60 C110 60, 120 75, 120 90 C120 120, 60 155, 60 155 C60 155, 60 120, 60 95Z"
        transform="translate(55, 20) scale(0.95)" fill="url(#fav-right)"/>
      <path d="M40 65 C40 50, 25 42, 18 42 C8 42, 0 52, 0 62 C0 82, 40 105, 40 105 C40 105, 80 82, 80 62 C80 52, 72 42, 62 42 C55 42, 40 50, 40 65Z"
        transform="translate(60, 60) scale(0.65)" fill="url(#fav-front)"/>
      <defs>
        <linearGradient id="fav-left" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9C27B0"/><stop offset="100%" stopColor="#D81B60"/>
        </linearGradient>
        <linearGradient id="fav-right" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E91E63"/><stop offset="100%" stopColor="#EC407A"/>
        </linearGradient>
        <linearGradient id="fav-front" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF6B9D"/><stop offset="100%" stopColor="#F48FB1"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

interface MiamoLoaderProps {
  size?: number;
  text?: string;
  className?: string;
}

export function MiamoLoader({ size = 56, text, className = '' }: MiamoLoaderProps) {
  return (
    <div className={`h-full flex items-center justify-center ${className}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="flex flex-col items-center gap-4"
      >
        <motion.div className="relative" style={{ width: size, height: size }}>
          <motion.div
            className="absolute inset-[-6px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(236,64,122,0.3) 0%, transparent 70%)',
            }}
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.95, 1.05, 0.95] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="relative w-full h-full"
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Image
              src="/logo.png"
              alt="Loading..."
              width={size}
              height={size}
              className="w-full h-full object-contain"
              priority
            />
          </motion.div>
        </motion.div>
        {text && (
          <motion.p
            className="text-[13px] text-text-muted font-medium tracking-wide"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            {text}
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}

export function MiamoLogo({
  size = 32,
  animated = true,
  className = '',
}: {
  size?: number;
  animated?: boolean;
  className?: string;
}) {
  return (
    <AnimatedMiamoLogo
      size={size}
      showWordmark={false}
      animated={animated}
      className={className}
    />
  );
}
