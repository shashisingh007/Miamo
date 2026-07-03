'use client';

import { useEffect, useRef } from 'react';
import { track } from '../index';

/**
 * Estimates reading time on long-form text. Uses scroll position within the
 * referenced element + visibility heartbeats. Emits one `dwell` event with
 * `kind: 'read'` and wordsPerMinute on unmount.
 */
export function useReadingTime<T extends HTMLElement>(name: string, wordCount?: number) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const start = performance.now();
    let visibleSince: number | null = performance.now();
    let cumulative = 0;
    const io = new IntersectionObserver(
      (entries) => {
        const now = performance.now();
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (visibleSince == null) visibleSince = now;
          } else if (visibleSince != null) {
            cumulative += now - visibleSince;
            visibleSince = null;
          }
        }
      },
      { threshold: [0, 0.25, 0.5] },
    );
    io.observe(el);
    return () => {
      if (visibleSince != null) cumulative += performance.now() - visibleSince;
      io.disconnect();
      const total = Math.round(cumulative);
      const totalElapsed = Math.round(performance.now() - start);
      const wpm = wordCount ? Math.round((wordCount / Math.max(1, total)) * 60_000) : undefined;
      track('dwell', { name, kind: 'read', d: total, elapsed: totalElapsed, wpm });
    };
  }, [name, wordCount]);
  return ref;
}
