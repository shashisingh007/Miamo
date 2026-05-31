// Halley's method (third-order root-finding).
// x_{n+1} = x_n - 2 f(x_n) f'(x_n) / (2 f'(x_n)^2 - f(x_n) f''(x_n))

export interface HalleyOptions {
  tolerance?: number;
  maxIterations?: number;
}

export interface HalleyResult {
  root: number;
  iterations: number;
  converged: boolean;
}

export function halleyMethod(
  f: (x: number) => number,
  fp: (x: number) => number,
  fpp: (x: number) => number,
  x0: number,
  opts: HalleyOptions = {},
): HalleyResult {
  const tol = opts.tolerance ?? 1e-10;
  const maxIt = opts.maxIterations ?? 50;
  if (!Number.isFinite(x0)) throw new Error('non-finite initial guess');
  if (!(tol > 0)) throw new Error('tolerance must be positive');
  if (!(Number.isInteger(maxIt) && maxIt > 0)) throw new Error('maxIterations must be a positive integer');

  let x = x0;
  for (let i = 1; i <= maxIt; i++) {
    const fx = f(x);
    if (!Number.isFinite(fx)) throw new Error('non-finite f(x)');
    if (Math.abs(fx) < tol) return { root: x, iterations: i, converged: true };
    const fpx = fp(x);
    const fppx = fpp(x);
    if (!Number.isFinite(fpx) || !Number.isFinite(fppx)) throw new Error('non-finite derivative');
    const denom = 2 * fpx * fpx - fx * fppx;
    if (Math.abs(denom) < 1e-300) throw new Error('denominator vanished');
    const next = x - (2 * fx * fpx) / denom;
    if (!Number.isFinite(next)) throw new Error('iteration diverged');
    if (Math.abs(next - x) < tol) return { root: next, iterations: i, converged: true };
    x = next;
  }
  return { root: x, iterations: maxIt, converged: false };
}
