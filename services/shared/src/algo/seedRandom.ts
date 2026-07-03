/**
 * seedRandom \u2014 deterministic 32-bit PRNG (mulberry32).
 *
 * Used by:
 *   - notif scheduler jitter (so two pods don't fire at the exact same ms)
 *   - A/B bucket assignment fallback when no userHash available
 *   - dtm next-question tie-breaker for equally-informative topics
 *
 * Pure, allocation-free in the hot path, deterministic for a given seed.
 * Not cryptographically secure \u2014 do not use for tokens / secrets.
 */
export type SeededRng = {
  /** Next uniform double in [0, 1). */
  next(): number;
  /** Next integer in [lo, hi] inclusive. */
  nextInt(lo: number, hi: number): number;
  /** Pick one element of `xs` uniformly. Returns null for empty. */
  pick<T>(xs: readonly T[]): T | null;
};

/** Hash an arbitrary string to a 32-bit seed (xfnv1a, stable). */
export function seedFromString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function makeRng(seed: number): SeededRng {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    nextInt(lo: number, hi: number): number {
      if (hi < lo) return lo;
      return lo + Math.floor(next() * (hi - lo + 1));
    },
    pick<T>(xs: readonly T[]): T | null {
      if (xs.length === 0) return null;
      return xs[Math.floor(next() * xs.length)];
    },
  };
}
