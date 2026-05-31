// Ridder's method for root finding on a bracket [a, b] with f(a)*f(b) < 0.

export interface RidderOptions {
  tolerance?: number;
  maxIterations?: number;
}

export interface RidderResult {
  root: number;
  iterations: number;
  converged: boolean;
}

export function ridderRoot(
  f: (x: number) => number,
  a: number,
  b: number,
  opts: RidderOptions = {},
): RidderResult {
  const tol = opts.tolerance ?? 1e-12;
  const maxIt = opts.maxIterations ?? 100;
  if (!Number.isFinite(a) || !Number.isFinite(b)) throw new Error('non-finite bracket');
  if (a === b) throw new Error('degenerate bracket');
  if (!(tol > 0)) throw new Error('tolerance must be positive');
  if (!(Number.isInteger(maxIt) && maxIt > 0)) throw new Error('maxIterations must be a positive integer');

  let lo = Math.min(a, b);
  let hi = Math.max(a, b);
  let fLo = f(lo);
  let fHi = f(hi);
  if (fLo === 0) return { root: lo, iterations: 0, converged: true };
  if (fHi === 0) return { root: hi, iterations: 0, converged: true };
  if (fLo * fHi > 0) throw new Error('bracket does not straddle a root');

  for (let i = 1; i <= maxIt; i++) {
    const mid = 0.5 * (lo + hi);
    const fMid = f(mid);
    const s = Math.sqrt(fMid * fMid - fLo * fHi);
    if (s === 0) return { root: mid, iterations: i, converged: true };
    const sign = fLo - fHi >= 0 ? 1 : -1;
    const next = mid + (mid - lo) * (sign * fMid) / s;
    const fNext = f(next);
    if (Math.abs(fNext) < tol) return { root: next, iterations: i, converged: true };

    if (fMid * fNext < 0) {
      lo = mid; fLo = fMid;
      hi = next; fHi = fNext;
    } else if (fLo * fNext < 0) {
      hi = next; fHi = fNext;
    } else {
      lo = next; fLo = fNext;
    }
    if (lo > hi) { const t = lo; lo = hi; hi = t; const ft = fLo; fLo = fHi; fHi = ft; }
    if (hi - lo < tol) return { root: 0.5 * (lo + hi), iterations: i, converged: true };
  }
  return { root: 0.5 * (lo + hi), iterations: maxIt, converged: false };
}
