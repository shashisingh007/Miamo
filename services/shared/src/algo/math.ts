/**
 * Shared math: cosine, decays, normalisers, weight composition.
 *
 * Algorithms compose by:
 *   const breakdown = { interestCos: 0.7, vibeCos: 0.6, ... };
 *   const weights   = { interestCos: 0.25, vibeCos: 0.20, ... };
 *   const score     = compose(breakdown, weights) * 100;  // 0..100
 *
 * compose() also handles cold-start gracefully: any key in `weights` whose
 * `breakdown` value is `null` is treated as missing — its weight is dropped
 * and the remaining weights are renormalised so they still sum to 1. This is
 * exactly what the brief specifies for new users with empty FeatureSnapshot.
 */
export function cosine(a: Float32Array, b: Float32Array): number {
  if (!a || !b || a.length !== b.length) return 0;
  let d = 0;
  for (let i = 0; i < a.length; i++) d += a[i] * b[i];
  return d;
}
/** Map cosine [-1..1] → [0..1]. */
export function cosTo01(c: number): number { return (c + 1) / 2; }

/** Exponential decay: returns 1 at x=0, 0.5 at x=halfLife, ~0 at x>>halfLife. */
export function expDecay(x: number, halfLife: number): number {
  if (halfLife <= 0) return x === 0 ? 1 : 0;
  return Math.exp(-Math.LN2 * Math.max(0, x) / halfLife);
}

/** log1p / log(cap): 0→0, cap→1, monotonic in between. */
export function logScale(x: number, cap: number): number {
  if (x <= 0) return 0;
  return Math.min(1, Math.log1p(x) / Math.log(cap));
}

/** Clip to [0..1]. */
export function clip01(x: number): number { return x < 0 ? 0 : x > 1 ? 1 : x; }
/** Clip to [0..100]. */
export function clip100(x: number): number { return x < 0 ? 0 : x > 100 ? 100 : x; }

export type Breakdown = Record<string, number | null>;
export type Weights = Record<string, number>;

/**
 * Compose a weighted sum, dropping null signals and renormalising the rest.
 * Returns a 0..1 score (multiply by 100 for the standard surface).
 */
export function compose(breakdown: Breakdown, weights: Weights): number {
  let totalW = 0;
  let sum = 0;
  for (const [k, w] of Object.entries(weights)) {
    const v = breakdown[k];
    if (v == null) continue;
    totalW += w;
    sum += w * clip01(v);
  }
  if (totalW === 0) return 0;
  return sum / totalW;
}

/** Jaccard similarity on string sets. */
export function jaccard(a: Set<string> | string[], b: Set<string> | string[]): number {
  const A = a instanceof Set ? a : new Set(a);
  const B = b instanceof Set ? b : new Set(b);
  if (A.size === 0 && B.size === 0) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter += 1;
  return inter / (A.size + B.size - inter);
}
