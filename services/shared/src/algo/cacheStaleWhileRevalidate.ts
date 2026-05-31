/**
 * cacheStaleWhileRevalidate \u2014 Phase 18 SWR cache-state classifier (pure).
 *
 * Given an entry's age and SWR/SIE thresholds, returns the lifecycle state
 * and a hint for what the caller should do (serve cached vs refetch vs both).
 *
 *   fresh      \u2192 age <= maxAge
 *   stale      \u2192 maxAge < age <= maxAge + swr
 *   error-ok   \u2192 (swr exhausted) AND age <= maxAge + swr + sie
 *   expired    \u2192 beyond every window
 */

export type SwrInput = {
  ageSeconds: number;
  maxAgeSeconds: number;
  staleWhileRevalidateSeconds?: number; // default 0
  staleIfErrorSeconds?: number;         // default 0
};

export type SwrState = 'fresh' | 'stale' | 'error-ok' | 'expired';

export type SwrResult = {
  state: SwrState;
  serveCached: boolean;
  shouldRevalidate: boolean;
  ageSeconds: number;
};

export function classifyCacheEntry(input: SwrInput): SwrResult {
  const age = Math.max(0, Number.isFinite(input.ageSeconds) ? input.ageSeconds : 0);
  const maxAge = Math.max(0, Number.isFinite(input.maxAgeSeconds) ? input.maxAgeSeconds : 0);
  const swr = Math.max(0, input.staleWhileRevalidateSeconds ?? 0);
  const sie = Math.max(0, input.staleIfErrorSeconds ?? 0);

  if (age <= maxAge) {
    return { state: 'fresh', serveCached: true, shouldRevalidate: false, ageSeconds: age };
  }
  if (age <= maxAge + swr) {
    return { state: 'stale', serveCached: true, shouldRevalidate: true, ageSeconds: age };
  }
  if (age <= maxAge + swr + sie) {
    return { state: 'error-ok', serveCached: true, shouldRevalidate: true, ageSeconds: age };
  }
  return { state: 'expired', serveCached: false, shouldRevalidate: true, ageSeconds: age };
}
