'use client';

import { useRef, useState, useCallback, type ReactNode } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  className?: string;
}

const THRESHOLD = 80;

export function PullToRefresh({ children, onRefresh, className }: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pullDistance = useMotionValue(0);
  const opacity = useTransform(pullDistance, [0, THRESHOLD], [0, 1]);
  const rotate = useTransform(pullDistance, [0, THRESHOLD], [0, 180]);
  const scale = useTransform(pullDistance, [0, THRESHOLD], [0.6, 1]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const el = containerRef.current;
    if (el && el.scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startY.current === 0 || refreshing) return;
    const el = containerRef.current;
    if (el && el.scrollTop > 0) return;
    const diff = Math.max(0, (e.touches[0].clientY - startY.current) * 0.4);
    pullDistance.set(Math.min(diff, THRESHOLD * 1.3));
  }, [refreshing, pullDistance]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance.get() >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      pullDistance.set(THRESHOLD * 0.7);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        pullDistance.set(0);
      }
    } else {
      pullDistance.set(0);
    }
    startY.current = 0;
  }, [pullDistance, refreshing, onRefresh]);

  return (
    <div className="relative">
      {/* Pull indicator */}
      <motion.div
        style={{ opacity, scale }}
        className="absolute top-2 left-1/2 -translate-x-1/2 z-20 w-10 h-10 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-pink-100 dark:border-pink-900/30 flex items-center justify-center"
      >
        <motion.div style={{ rotate }}>
          <RefreshCw className={`w-5 h-5 text-pink-500 ${refreshing ? 'animate-spin' : ''}`} />
        </motion.div>
      </motion.div>

      <div
        ref={containerRef}
        className={className}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ overflowY: 'auto', height: '100%' }}
      >
        {children}
      </div>
    </div>
  );
}
