/**
 * intentDecay \u2014 Phase 16 generic time-decay helpers for intent / signal scores.
 *
 * Three shapes the v6 algorithms compose with:
 *   - exponential   e^(-ageMs / halfLifeMs)                  smooth, no cliff
 *   - linear        max(0, 1 - ageMs / windowMs)             hard cutoff
 *   - stepped       piecewise: 1.0 < grace, 0.5 < soft, 0    age-bucketed
 *
 * Pure, deterministic, NaN-safe.
 */
export function expDecayMs(ageMs: number, halfLifeMs: number): number {
  if (!(halfLifeMs > 0)) return 0;
  if (!Number.isFinite(ageMs) || ageMs <= 0) return 1;
  return Math.pow(0.5, ageMs / halfLifeMs);
}

export function linearDecayMs(ageMs: number, windowMs: number): number {
  if (!(windowMs > 0)) return 0;
  if (!Number.isFinite(ageMs) || ageMs <= 0) return 1;
  if (ageMs >= windowMs) return 0;
  return 1 - ageMs / windowMs;
}

export type SteppedDecayBucket = { upToMs: number; weight: number };

/** Step function: returns the weight of the first bucket whose threshold
 *  age <= upToMs covers `ageMs`. Buckets must be supplied in ascending
 *  upToMs order. Returns 0 if `ageMs` exceeds the last bucket. */
export function steppedDecayMs(ageMs: number, buckets: readonly SteppedDecayBucket[]): number {
  if (!Number.isFinite(ageMs) || ageMs < 0) ageMs = 0;
  for (const b of buckets) {
    if (ageMs <= b.upToMs) return b.weight;
  }
  return 0;
}
