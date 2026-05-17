'use client';

import { motion } from 'framer-motion';
import { type ReactNode } from 'react';

// ═══════════════════════════════════════════════════════
// PAGE TRANSITION — PREMIUM FADE + SLIDE + BLUR
// ═══════════════════════════════════════════════════════

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 16,
    filter: 'blur(6px)',
    scale: 0.99,
  },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    scale: 1,
  },
  exit: {
    opacity: 0,
    y: -12,
    filter: 'blur(4px)',
    scale: 0.99,
  },
};

const pageTransition = {
  duration: 0.35,
  ease: [0.25, 0.46, 0.45, 0.94],
};

/**
 * Animated page transition wrapper using Framer Motion.
 * Applies a fade + slide-up + blur entrance and fade + slide-up + blur exit
 * with a 350ms easing curve. Wrap page content inside `<PageTransition>`.
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════
// STAGGER CONTAINER — ANIMATE CHILDREN
// ═══════════════════════════════════════════════════════

interface StaggerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

const staggerItem = {
  initial: { opacity: 0, y: 20, filter: 'blur(4px)' },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export function StaggerContainer({ children, className }: StaggerProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════
// CARD ENTRANCE — 3D PERSPECTIVE
// ═══════════════════════════════════════════════════════

export function Card3DEntrance({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, rotateX: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ perspective: '800px' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════
// HAPTIC BUTTON WRAPPER
// ═══════════════════════════════════════════════════════

interface HapticButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hapticType?: 'tap' | 'like' | 'heavy';
}

export function HapticButton({ children, className, onClick, hapticType = 'tap' }: HapticButtonProps) {
  const tapScale = hapticType === 'heavy' ? 0.9 : hapticType === 'like' ? 0.92 : 0.95;
  return (
    <motion.button
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: tapScale }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={className}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════
// PULL TO REFRESH
// ═══════════════════════════════════════════════════════

export { PullToRefresh } from './pull-to-refresh';

// ═══════════════════════════════════════════════════════
// INFINITE SCROLL SENTINEL
// ═══════════════════════════════════════════════════════

export { InfiniteScrollSentinel } from './infinite-scroll';
