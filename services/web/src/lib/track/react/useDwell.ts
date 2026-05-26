'use client';

import { useEffect, useRef } from 'react';
import { track } from '../index';

/**
 * Measures continuous visible dwell time on the referenced element. When the
 * element leaves the viewport (or the component unmounts), emits a `dwell`
 * event with total visible ms.
 */
export function useDwell<T extends HTMLElement>(name: string) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    let visibleSince: number | null = null;
    let cumulative = 0;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const now = performance.now();
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            if (visibleSince == null) visibleSince = now;
          } else if (visibleSince != null) {
            cumulative += now - visibleSince;
            visibleSince = null;
          }
        }
      },
      { threshold: [0, 0.5, 1] },
    );
    io.observe(el);
    return () => {
      if (visibleSince != null) cumulative += performance.now() - visibleSince;
      io.disconnect();
      if (cumulative > 250) track('dwell', { name, d: Math.round(cumulative) });
    };
  }, [name]);
  return ref;
}
