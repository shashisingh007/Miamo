'use client';

/**
 * useCachedResource — stale-while-revalidate localStorage cache for async data.
 *
 * Returns cached value instantly on mount (no loading flicker if cached),
 * then revalidates in the background. Cache is namespaced per user (same
 * storage rules as usePersistentState) so accounts on the same browser
 * don't bleed.
 *
 * Used by the Creativity surfaces so navigating away and back doesn't wipe
 * the reels feed, the board grid, or the user's scroll position in either.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores';

const ROOT = 'miamo:cache:v1';

function fullKey(userId: string | null | undefined, key: string) {
  return `${ROOT}:${userId || 'anon'}:${key}`;
}

interface Envelope<T> {
  v: 2;
  t: number;
  data: T;
}

export interface CachedResource<T> {
  data: T | null;
  loading: boolean;
  error: unknown;
  refetch: () => Promise<void>;
  setData: (next: T | null | ((prev: T | null) => T | null)) => void;
  cachedAt: number | null;
}

export interface UseCachedResourceOptions {
  /** Skip the network fetch entirely until this is true. Default true. */
  enabled?: boolean;
  /** If cache is younger than this (ms), don't revalidate. Default 0 = always revalidate. */
  freshFor?: number;
  /** Max cache age (ms). Older cache is treated as missing. Default 6h. */
  maxAge?: number;
}

export function useCachedResource<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts: UseCachedResourceOptions = {},
): CachedResource<T> {
  const { enabled = true, freshFor = 0, maxAge = 6 * 60 * 60 * 1000 } = opts;
  const userId = useAuthStore((s) => (s.user as any)?.id ?? null);

  const [data, setDataState] = useState<T | null>(() => readCache<T>(userId, key, maxAge));
  const [cachedAt, setCachedAt] = useState<number | null>(() => readCacheAt(userId, key, maxAge));
  const [loading, setLoading] = useState<boolean>(data === null);
  const [error, setError] = useState<unknown>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // Re-read cache when key or user changes.
  useEffect(() => {
    const cached = readCache<T>(userId, key, maxAge);
    setDataState(cached);
    setCachedAt(readCacheAt(userId, key, maxAge));
    setLoading(cached === null);
    setError(null);
  }, [userId, key, maxAge]);

  const refetch = useCallback(async () => {
    if (!enabled) return;
    setLoading((prev) => prev || data === null);
    setError(null);
    try {
      const next = await fetcherRef.current();
      writeCache(userId, key, next);
      setDataState(next);
      setCachedAt(Date.now());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, userId, key]);

  useEffect(() => {
    if (!enabled) return;
    if (freshFor > 0 && cachedAt && Date.now() - cachedAt < freshFor) return;
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, userId, key, refetch]);

  const setData = useCallback(
    (next: T | null | ((prev: T | null) => T | null)) => {
      setDataState((prev) => {
        const value =
          typeof next === 'function' ? (next as (prev: T | null) => T | null)(prev) : next;
        if (value === null) {
          clearCache(userId, key);
        } else {
          writeCache(userId, key, value);
        }
        setCachedAt(value === null ? null : Date.now());
        return value;
      });
    },
    [userId, key],
  );

  return { data, loading, error, refetch, setData, cachedAt };
}

function readCache<T>(userId: string | null | undefined, key: string, maxAge: number): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(fullKey(userId, key));
    if (!raw) return null;
    const env = JSON.parse(raw) as Envelope<T>;
    if (!env || env.v !== 2 || typeof env.t !== 'number') return null;
    if (Date.now() - env.t > maxAge) return null;
    return env.data;
  } catch {
    return null;
  }
}

function readCacheAt(userId: string | null | undefined, key: string, maxAge: number): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(fullKey(userId, key));
    if (!raw) return null;
    const env = JSON.parse(raw) as Envelope<unknown>;
    if (!env || env.v !== 2 || typeof env.t !== 'number') return null;
    if (Date.now() - env.t > maxAge) return null;
    return env.t;
  } catch {
    return null;
  }
}

function writeCache<T>(userId: string | null | undefined, key: string, data: T) {
  if (typeof window === 'undefined') return;
  try {
    const env: Envelope<T> = { v: 2, t: Date.now(), data };
    window.localStorage.setItem(fullKey(userId, key), JSON.stringify(env));
  } catch {
    /* quota — drop silently */
  }
}

function clearCache(userId: string | null | undefined, key: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(fullKey(userId, key));
  } catch {
    /* ignore */
  }
}
