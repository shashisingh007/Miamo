export interface SecantOptions {
  tol?: number;
  maxIterations?: number;
}

export interface SecantResult {
  root: number;
  iterations: number;
  converged: boolean;
}

export function secantRootFinder(
  f: (x: number) => number,
  x0: number,
  x1: number,
  opts: SecantOptions = {},
): SecantResult {
  const tol = opts.tol ?? 1e-10;
  const maxIterations = opts.maxIterations ?? 100;
  if (!Number.isFinite(x0) || !Number.isFinite(x1)) {
    throw new Error('secantRootFinder: initial guesses must be finite');
  }
  if (x0 === x1) {
    throw new Error('secantRootFinder: initial guesses must differ');
  }
  let prev = x0;
  let curr = x1;
  let fprev = f(prev);
  let fcurr = f(curr);
  if (!Number.isFinite(fprev) || !Number.isFinite(fcurr)) {
    throw new Error('secantRootFinder: non-finite f at initial guesses');
  }
  for (let i = 1; i <= maxIterations; i += 1) {
    if (fcurr === 0) return { root: curr, iterations: i - 1, converged: true };
    const denom = fcurr - fprev;
    if (denom === 0) {
      throw new Error('secantRootFinder: zero denominator (flat secant)');
    }
    const next = curr - (fcurr * (curr - prev)) / denom;
    if (!Number.isFinite(next)) {
      throw new Error('secantRootFinder: non-finite iterate');
    }
    if (Math.abs(next - curr) < tol) {
      return { root: next, iterations: i, converged: true };
    }
    prev = curr;
    fprev = fcurr;
    curr = next;
    fcurr = f(curr);
    if (!Number.isFinite(fcurr)) {
      throw new Error('secantRootFinder: non-finite f during iteration');
    }
  }
  return { root: curr, iterations: maxIterations, converged: false };
}
