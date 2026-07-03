'use client';

/**
 * useScrollRestore — remembers the scroll position of a container across
 * navigations within the SPA. Backed by sessionStorage so it survives
 * route changes but not full reloads.
 */

import { useEffect, useRef } from 'react';

const KEY = 'miamo:scroll:v1';

function read(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function write(map: Record<string, number>) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* quota — drop */
  }
}

/**
 * Pass a stable `id` (e.g. pathname) and a `getContainer` that returns
 * the scrollable element (or null). Restores on mount, persists on
 * unmount + during scroll (throttled).
 */
export function useScrollRestore(id: string, getContainer: () => HTMLElement | null) {
  const ready = useRef(false);

  useEffect(() => {
    ready.current = false;
    const container = getContainer();
    if (!container) return;

    const map = read();
    const saved = map[id];
    if (typeof saved === 'number' && saved > 0) {
      // Two frames so layout settles (sticky headers, lazy images, etc).
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          container.scrollTop = saved;
          ready.current = true;
        });
      });
    } else {
      ready.current = true;
    }

    let raf = 0;
    const onScroll = () => {
      if (!ready.current) return;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const next = read();
        next[id] = container.scrollTop;
        write(next);
      });
    };
    container.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
      // Final flush on unmount.
      const next = read();
      next[id] = container.scrollTop;
      write(next);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
}
