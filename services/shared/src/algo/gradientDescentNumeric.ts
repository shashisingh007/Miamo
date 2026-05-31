// Numeric gradient descent for f: R^n -> R, with finite-difference gradient
// approximation. Returns {x, value, iterations, converged} where converged is
// true if the gradient norm fell below tol.

export interface GdOptions {
  lr?: number;
  maxIter?: number;
  tol?: number;
  h?: number; // finite-difference step
}

export interface GdResult {
  x: number[];
  value: number;
  iterations: number;
  converged: boolean;
}

function finiteDiffGrad(f: (v: number[]) => number, x: number[], h: number): number[] {
  const g = new Array<number>(x.length).fill(0);
  for (let i = 0; i < x.length; i += 1) {
    const orig = x[i];
    x[i] = orig + h;
    const fp = f(x);
    x[i] = orig - h;
    const fm = f(x);
    x[i] = orig;
    g[i] = (fp - fm) / (2 * h);
  }
  return g;
}

export function gradientDescentMin(
  f: (v: number[]) => number,
  x0: number[],
  opts: GdOptions = {},
): GdResult {
  if (typeof f !== 'function') throw new Error('gradientDescentMin: f must be function');
  if (!Array.isArray(x0) || x0.length === 0) {
    throw new Error('gradientDescentMin: x0 must be non-empty array');
  }
  for (const v of x0) {
    if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error('gradientDescentMin: x0 must be finite numbers');
  }
  const lr = opts.lr ?? 0.1;
  const maxIter = opts.maxIter ?? 1000;
  const tol = opts.tol ?? 1e-8;
  const h = opts.h ?? 1e-6;
  if (lr <= 0) throw new Error('gradientDescentMin: lr must be positive');
  const x = x0.slice();
  let iter = 0;
  let converged = false;
  for (; iter < maxIter; iter += 1) {
    const g = finiteDiffGrad(f, x, h);
    let normSq = 0;
    for (let i = 0; i < g.length; i += 1) normSq += g[i] * g[i];
    if (Math.sqrt(normSq) < tol) {
      converged = true;
      break;
    }
    for (let i = 0; i < x.length; i += 1) x[i] -= lr * g[i];
  }
  return { x, value: f(x), iterations: iter, converged };
}

export function gradientDescentNumeric() {
  return { gradientDescentMin };
}
