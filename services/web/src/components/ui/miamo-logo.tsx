'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import Image from 'next/image';

/* ═══════════════════════════════════════════════════════
   MIAMO LOGO SYSTEM — Premium Rose-Gold/Black
   Uses actual logo.jpg (the 3D rose-gold M)
   6 variants: Full, Static, Compact, Splash, Favicon, Sidebar
   ═══════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════
   1. ANIMATED MIAMO LOGO — Full logo with wordmark
   Use: sidebar, headers, landing page hero
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
  showWordmark = true,
  animated = true,
  className = '',
  variant = 'full',
  onClick,
}: AnimatedMiamoLogoProps) {
  const [hovered, setHovered] = useState(false);
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
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      {/* Logo Image */}
      <motion.div
        className="relative rounded-[10px] flex items-center justify-center overflow-hidden"
        style={{ width: iconSize, height: iconSize }}
        whileHover={animated ? { scale: 1.06 } : undefined}
        whileTap={animated ? { scale: 0.94 } : undefined}
      >
        {/* Ambient glow behind logo */}
        <motion.div
          className="absolute inset-0 rounded-[10px]"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(236,64,122,0.2), transparent 70%)',
          }}
          animate={glowPulse ? {
            opacity: [0.5, 1, 0.5],
          } : undefined}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* The actual M logo image */}
        <motion.div
          className="relative z-10 w-full h-full rounded-[10px] overflow-hidden"
          initial={animated ? { opacity: 0, scale: 0.8 } : { opacity: 1, scale: 1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        >
          <Image
            src="/logo.jpg"
            alt="Miamo"
            width={Math.round(iconSize)}
            height={Math.round(iconSize)}
            className="w-full h-full object-cover rounded-[10px]"
            priority
          />
        </motion.div>
      </motion.div>

      {/* Wordmark */}
      {showWordmark && variant !== 'compact' && (
        <MiamoWordmark animated={animated} className="text-[17px]" />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   2. MIAMO WORDMARK — Letter-by-letter reveal
   ═══════════════════════════════════════════════════════ */
export function MiamoWordmark({
  className = '',
  animated = true,
}: {
  className?: string;
  animated?: boolean;
}) {
  const letters = 'Miamo'.split('');

  return (
    <span className={`font-extrabold tracking-tight inline-flex ${className}`}>
      {letters.map((letter, i) => (
        <motion.span
          key={i}
          initial={animated ? { opacity: 0, y: 6, filter: 'blur(4px)' } : undefined}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{
            delay: animated ? 0.4 + i * 0.07 : 0,
            duration: 0.35,
            ease: [0.4, 0, 0.2, 1],
          }}
          className={
            i === 0
              ? 'bg-gradient-to-r from-[#E91E63] to-[#D81B60] bg-clip-text text-transparent'
              : 'text-text-primary'
          }
        >
          {letter}
        </motion.span>
      ))}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════
   3. STATIC WORDMARK — No animation, plain render
   ═══════════════════════════════════════════════════════ */
export function MiamoStaticWordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-extrabold tracking-tight ${className}`}>
      <span className="bg-gradient-to-r from-[#D4A574] to-[#C9956B] bg-clip-text text-transparent">M</span>
      <span className="text-white">iamo</span>
    </span>
  );
}

/* ═══════════════════════════════════════════════════════
   4. COMPACT APP ICON — Just the M mark, no wordmark
   ═══════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════
   5. SPLASH / LOADING ANIMATION — Full-screen logo reveal
   ═══════════════════════════════════════════════════════ */
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
          className="fixed inset-0 z-[9999] bg-[#0a0a0f] flex items-center justify-center"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Radial glow */}
          <motion.div
            className="absolute w-[400px] h-[400px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(212,165,116,0.12) 0%, transparent 70%)',
            }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="flex flex-col items-center gap-6">
            {/* Large Logo */}
            <motion.div
              className="relative w-24 h-24 rounded-2xl flex items-center justify-center overflow-hidden"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            >
              <Image
                src="/logo.jpg"
                alt="Miamo"
                width={96}
                height={96}
                className="w-full h-full object-cover rounded-2xl"
                priority
              />
            </motion.div>

            {/* Wordmark reveal */}
            {phase === 'reveal' && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              >
                <MiamoWordmark animated={true} className="text-3xl" />
              </motion.div>
            )}

            {/* Subtle tagline */}
            <motion.p
              className="text-[11px] text-white/20 font-medium tracking-[0.2em] uppercase"
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

/* ═══════════════════════════════════════════════════════
   6. FAVICON SVG — Static, embeddable (rose-gold M)
   ═══════════════════════════════════════════════════════ */
export function MiamoFavicon({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#0a0a0f" />
      <defs>
        <linearGradient id="fav-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E8B89A" />
          <stop offset="50%" stopColor="#D4A574" />
          <stop offset="100%" stopColor="#B8804A" />
        </linearGradient>
      </defs>
      <path
        d="M7 24V8l5 8 5-8v16"
        stroke="url(#fav-g)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M22 8c3 0 5 3 5 6s-2 10-5 10"
        stroke="url(#fav-g)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════
   7. MIAMO LOADER — Logo-based loading indicator
   Replaces all spinning circles with the M logo pulse
   ═══════════════════════════════════════════════════════ */
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
        {/* Logo with breathing glow */}
        <motion.div
          className="relative"
          style={{ width: size, height: size }}
        >
          {/* Outer glow ring */}
          <motion.div
            className="absolute inset-[-6px] rounded-2xl"
            style={{
              background: 'radial-gradient(circle, rgba(212,165,116,0.3) 0%, transparent 70%)',
            }}
            animate={{
              opacity: [0.4, 1, 0.4],
              scale: [0.95, 1.05, 0.95],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Logo image */}
          <motion.div
            className="relative w-full h-full rounded-xl overflow-hidden"
            animate={{
              scale: [1, 1.04, 1],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Image
              src="/logo.jpg"
              alt="Loading..."
              width={size}
              height={size}
              className="w-full h-full object-cover rounded-xl"
              priority
            />
          </motion.div>
        </motion.div>

        {/* Optional loading text */}
        {text && (
          <motion.p
            className="text-[13px] text-white/40 font-medium tracking-wide"
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

/* ═══════════════════════════════════════════════════════
   LEGACY EXPORTS — keep backward compatibility
   ═══════════════════════════════════════════════════════ */
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
