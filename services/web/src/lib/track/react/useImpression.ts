'use client';

import { useEffect, useRef } from 'react';
import { track } from '../index';

/**
 * Fires an impression event the first time the referenced element crosses
 * 50% viewport visibility. Returns the ref to attach. Idempotent per element.
 */
export function useImpression<T extends HTMLElement>(name: string, payload?: Record<string, unknown>) {
  const ref = useRef<T | null>(null);
  const fired = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || fired.current) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5 && !fired.current) {
            fired.current = true;
            track('impression', { name, ...payload });
            io.disconnect();
            return;
          }
        }
      },
      { threshold: [0.5] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [name, payload]);
  return ref;
}
