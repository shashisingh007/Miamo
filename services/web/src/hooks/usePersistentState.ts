'use client';

/**
 * usePersistentState — SSR-safe useState replacement that mirrors a value to
 * `localStorage`. Initial render always returns `defaultValue` (so SSR + first
 * client render match). After mount, the stored value (if any) is hydrated.
 *
 * Storage is namespaced per signed-in user (auth store's user.id) so different
 * accounts on the same browser don't bleed state into each other. Anonymous
 * sessions use the namespace `anon`.
 */

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useAuthStore } from '@/stores';

const ROOT = 'miamo:persist:v1';

function fullKey(userId: string | null | undefined, key: string) {
  return `${ROOT}:${userId || 'anon'}:${key}`;
}

export function usePersistentState<T>(
  key: string,
  defaultValue: T,
): [T, Dispatch<SetStateAction<T>>, { hydrated: boolean; reset: () => void }] {
  const userId = useAuthStore((s) => (s.user as any)?.id ?? null);
  const [value, setValue] = useState<T>(defaultValue);
  const [hydrated, setHydrated] = useState(false);
  const skipNextWriteRef = useRef(true);

  // Hydrate on mount (and whenever user id changes)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    skipNextWriteRef.current = true;
    try {
      const raw = window.localStorage.getItem(fullKey(userId, key));
      if (raw != null) setValue(JSON.parse(raw) as T);
      else setValue(defaultValue);
    } catch {
      setValue(defaultValue);
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, key]);

  // Persist on change (skip the hydration write)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (skipNextWriteRef.current) {
      skipNextWriteRef.current = false;
      return;
    }
    try {
      window.localStorage.setItem(fullKey(userId, key), JSON.stringify(value));
    } catch {}
  }, [value, userId, key]);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(fullKey(userId, key));
    } catch {}
    setValue(defaultValue);
  }, [userId, key, defaultValue]);

  return [value, setValue, { hydrated, reset }];
}
