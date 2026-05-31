// Newton's method for finding a root of f(x) = 0. Requires f and its
// derivative f' (numerical derivative not used). Stops when |x_{k+1} - x_k| <
// tol, when |f(x_k)| < tol, or after maxIter iterations.
//
// Returns the approximated root plus diagnostics. Throws on bad inputs or
// when the derivative is too small (would divide by ~0).

export interface NewtonOptions {
  tol?: number;
  maxIter?: number;
  derivativeMin?: number;
}

export interface NewtonResult {
  root: number;
  iterations: number;
  converged: boolean;
}

export function newtonsMethodRoot(
  f: (x: number) => number,
  fPrime: (x: number) => number,
  x0: number,
  options: NewtonOptions = {},
): NewtonResult {
  if (typeof f !== 'function' || typeof fPrime !== 'function') {
    throw new TypeError('f and fPrime must be functions');
  }
  if (!Number.isFinite(x0)) throw new RangeError('x0 must be finite');
  const tol = options.tol ?? 1e-10;
  const maxIter = options.maxIter ?? 100;
  const derivativeMin = options.derivativeMin ?? 1e-14;
  if (!Number.isFinite(tol) || tol <= 0) throw new RangeError('tol must be positive finite');
  if (!Number.isInteger(maxIter) || maxIter <= 0) throw new RangeError('maxIter must be positive integer');
  if (!Number.isFinite(derivativeMin) || derivativeMin <= 0) throw new RangeError('derivativeMin must be positive finite');

  let x = x0;
  for (let i = 1; i <= maxIter; i += 1) {
    const fx = f(x);
    if (!Number.isFinite(fx)) throw new RangeError('f produced non-finite value');
    if (Math.abs(fx) < tol) return { root: x, iterations: i, converged: true };
    const fpx = fPrime(x);
    if (!Number.isFinite(fpx)) throw new RangeError("f' produced non-finite value");
    if (Math.abs(fpx) < derivativeMin) throw new Error("derivative too small; aborting");
    const next = x - fx / fpx;
    if (!Number.isFinite(next)) throw new RangeError('Newton iterate diverged');
    if (Math.abs(next - x) < tol) return { root: next, iterations: i, converged: true };
    x = next;
  }
  return { root: x, iterations: maxIter, converged: false };
}
