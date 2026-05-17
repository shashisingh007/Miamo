'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';

// ─── useDebounce ────────────────────────────────────
/** Debounce a value: returns `value` after `delay` ms of inactivity */
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── useDebouncedCallback ───────────────────────────
/** Returns a debounced version of the callback */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const cbRef = useRef(callback);
  cbRef.current = callback;

  return useCallback(
    ((...args: unknown[]) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => cbRef.current(...args), delay);
    }) as T,
    [delay]
  );
}

// ─── useOptimistic ──────────────────────────────────
/** Optimistic update hook: sets value immediately, rolls back on API error */
export function useOptimistic<T>(
  initialValue: T,
  persistFn: (value: T) => Promise<unknown>
): [T, (value: T) => void, boolean] {
  const [value, setValue] = useState(initialValue);
  const [pending, setPending] = useState(false);
  const prevRef = useRef(initialValue);

  // Sync with external changes
  useEffect(() => { setValue(initialValue); prevRef.current = initialValue; }, [initialValue]);

  const setOptimistic = useCallback((newValue: T) => {
    const prev = prevRef.current;
    prevRef.current = newValue;
    setValue(newValue);
    setPending(true);
    persistFn(newValue)
      .catch(() => { setValue(prev); prevRef.current = prev; })
      .finally(() => setPending(false));
  }, [persistFn]);

  return [value, setOptimistic, pending];
}

// ─── useMemoCompare ─────────────────────────────────
/** Like useMemo but with a custom comparison function */
export function useMemoCompare<T>(
  factory: () => T,
  deps: React.DependencyList,
  compare: (prev: T, next: T) => boolean = Object.is
): T {
  const ref = useRef<T>();
  const next = useMemo(factory, deps);
  if (ref.current === undefined || !compare(ref.current, next)) {
    ref.current = next;
  }
  return ref.current;
}
