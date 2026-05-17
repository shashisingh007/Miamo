'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface InfiniteScrollSentinelProps {
  onLoadMore: () => Promise<void> | void;
  hasMore: boolean;
  loading?: boolean;
  rootMargin?: string;
}

/**
 * Intersection Observer–based infinite scroll sentinel.
 * Place at the bottom of a scrollable list; calls `onLoadMore` when
 * the sentinel enters the viewport (with configurable `rootMargin`).
 *
 * Shows a bouncing dot loader while loading. Stops observing when `!hasMore`.
 *
 * @param onLoadMore - Async callback to load the next page of results
 * @param hasMore - Whether more results are available to load
 * @param loading - Whether a load is currently in progress
 * @param rootMargin - IntersectionObserver root margin (default: '300px')
 */
export function InfiniteScrollSentinel({ onLoadMore, hasMore, loading, rootMargin = '300px' }: InfiniteScrollSentinelProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    if (!hasMore || loading || triggered) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) {
          setTriggered(true);
          Promise.resolve(onLoadMore()).finally(() => setTriggered(false));
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore, rootMargin, triggered]);

  return (
    <div ref={sentinelRef} className="w-full py-6 flex items-center justify-center">
      {loading && hasMore && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2"
        >
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-gradient-to-r from-pink-400 to-rose-400"
                animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
          <span className="text-xs text-gray-400 font-medium">Loading more...</span>
        </motion.div>
      )}
    </div>
  );
}
