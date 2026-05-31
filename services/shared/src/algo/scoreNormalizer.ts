/**
 * scoreNormalizer \u2014 Phase 15 cross-surface score normaliser.
 *
 * Discover, deep-compat, and notif-timing all emit scores in different
 * native units (forYou: 0..100, dtmV6: 0..1, notif: 0..1). When surfaces
 * compose scores from multiple algos (e.g. "top picks" that blends
 * forYou + dtm), we need a consistent [0, 1] scale.
 *
 * Three strategies, all pure & deterministic:
 *   - minMax     map [min, max] linearly to [0, 1].
 *   - robust     map [p25, p95] linearly to [0, 1] (clip outside).
 *   - logistic   1 / (1 + e^{-k(x - x0)}); k & x0 caller-supplied.
 *
 * Returns NaN-safe values (NaN inputs map to 0).
 */
export type NormalizeStrategy =
  | { kind: 'minMax'; min: number; max: number }
  | { kind: 'robust'; p25: number; p95: number }
  | { kind: 'logistic'; k: number; x0: number };

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

export function normalizeScore(x: number, strat: NormalizeStrategy): number {
  if (!Number.isFinite(x)) return 0;
  switch (strat.kind) {
    case 'minMax': {
      if (!(strat.max > strat.min)) return 0;
      return clamp01((x - strat.min) / (strat.max - strat.min));
    }
    case 'robust': {
      if (!(strat.p95 > strat.p25)) return 0;
      return clamp01((x - strat.p25) / (strat.p95 - strat.p25));
    }
    case 'logistic': {
      const exponent = -strat.k * (x - strat.x0);
      if (exponent > 50) return 0;
      if (exponent < -50) return 1;
      return clamp01(1 / (1 + Math.exp(exponent)));
    }
  }
}

/** Convenience: normalise an entire array in one pass. */
export function normalizeScores(xs: number[], strat: NormalizeStrategy): number[] {
  return xs.map((x) => normalizeScore(x, strat));
}

/** Derive a robust strategy from an array of observed scores. */
export function fitRobust(xs: number[]): NormalizeStrategy {
  const clean = xs.filter((x) => Number.isFinite(x)).slice().sort((a, b) => a - b);
  if (clean.length === 0) return { kind: 'minMax', min: 0, max: 1 };
  const pick = (frac: number): number => {
    const i = Math.max(0, Math.min(clean.length - 1, Math.floor(frac * (clean.length - 1))));
    return clean[i];
  };
  const p25 = pick(0.25);
  const p95 = pick(0.95);
  if (p95 <= p25) {
    return { kind: 'minMax', min: clean[0], max: clean[clean.length - 1] };
  }
  return { kind: 'robust', p25, p95 };
}
