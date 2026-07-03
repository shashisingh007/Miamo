'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A one-shot countdown timer hook used by the OTP resend UI. Starts at
 * `initialSeconds`, ticks once per second, exposes the number of seconds
 * remaining, and stops at 0. Call `reset()` (optionally with a new
 * duration) to restart.
 *
 * The interval is cleaned up automatically on unmount, on hitting 0, and
 * when a fresh `reset()` replaces the previous timer.
 */
export function useCountdown(initialSeconds: number = 0) {
  const [secondsLeft, setSecondsLeft] = useState<number>(initialSeconds);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback((seconds: number) => {
    clear();
    setSecondsLeft(seconds);
    if (seconds <= 0) return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, [clear]);

  const reset = useCallback((seconds?: number) => {
    start(typeof seconds === 'number' ? seconds : initialSeconds);
  }, [start, initialSeconds]);

  // Kick off the initial countdown once (if any). We intentionally do NOT
  // depend on `initialSeconds` here — the initial value is captured on
  // mount; callers restart via `reset(n)`.
  useEffect(() => {
    if (initialSeconds > 0) start(initialSeconds);
    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { secondsLeft, reset };
}
