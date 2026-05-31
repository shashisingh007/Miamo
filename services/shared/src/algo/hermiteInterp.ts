// Cubic Hermite interpolation on a piecewise-linear knot sequence.
// Given strictly increasing xs[], values ys[], and derivatives ms[],
// constructs an evaluator for x in [xs[0], xs[xs.length-1]].

export interface HermiteInterpolant {
  evaluate: (x: number) => number;
}

export function hermiteInterp(
  xs: number[],
  ys: number[],
  ms: number[],
): HermiteInterpolant {
  const n = xs.length;
  if (n < 2) throw new Error('require at least 2 knots');
  if (ys.length !== n) throw new Error('ys length mismatch');
  if (ms.length !== n) throw new Error('ms length mismatch');
  for (let i = 1; i < n; i++) {
    if (!(xs[i] > xs[i - 1])) throw new Error('xs must be strictly increasing');
  }

  const evaluate = (x: number): number => {
    if (!Number.isFinite(x)) throw new Error('non-finite x');
    if (x < xs[0] || x > xs[n - 1]) throw new Error('x outside interpolation range');
    // Binary search for segment.
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (xs[mid] <= x) lo = mid; else hi = mid;
    }
    const h = xs[hi] - xs[lo];
    const t = (x - xs[lo]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    return h00 * ys[lo] + h10 * h * ms[lo] + h01 * ys[hi] + h11 * h * ms[hi];
  };

  return { evaluate };
}
