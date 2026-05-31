export interface BisectionOptions {
  tol?: number;
  maxIterations?: number;
}

export interface BisectionResult {
  root: number;
  iterations: number;
  converged: boolean;
}

export function bisectionRootFinder(
  f: (x: number) => number,
  a: number,
  b: number,
  opts: BisectionOptions = {},
): BisectionResult {
  const tol = opts.tol ?? 1e-10;
  const maxIterations = opts.maxIterations ?? 200;
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    throw new Error('bisectionRootFinder: interval endpoints must be finite');
  }
  let lo = Math.min(a, b);
  let hi = Math.max(a, b);
  let flo = f(lo);
  let fhi = f(hi);
  if (!Number.isFinite(flo) || !Number.isFinite(fhi)) {
    throw new Error('bisectionRootFinder: non-finite f at endpoint');
  }
  if (flo === 0) return { root: lo, iterations: 0, converged: true };
  if (fhi === 0) return { root: hi, iterations: 0, converged: true };
  if (flo * fhi > 0) {
    throw new Error('bisectionRootFinder: no sign change in interval');
  }
  let iter = 0;
  while (iter < maxIterations) {
    const mid = (lo + hi) / 2;
    const fmid = f(mid);
    if (!Number.isFinite(fmid)) {
      throw new Error('bisectionRootFinder: non-finite f at midpoint');
    }
    iter += 1;
    if (fmid === 0 || (hi - lo) / 2 < tol) {
      return { root: mid, iterations: iter, converged: true };
    }
    if (flo * fmid < 0) {
      hi = mid;
      fhi = fmid;
    } else {
      lo = mid;
      flo = fmid;
    }
  }
  return { root: (lo + hi) / 2, iterations: iter, converged: false };
}
