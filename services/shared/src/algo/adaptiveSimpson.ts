function simpson(f: (x: number) => number, a: number, b: number, fa: number, fb: number, fm: number): number {
  return ((b - a) / 6) * (fa + 4 * fm + fb);
}

function recurse(
  f: (x: number) => number,
  a: number,
  b: number,
  fa: number,
  fb: number,
  fm: number,
  whole: number,
  tol: number,
  depth: number,
  maxDepth: number,
): number {
  const m = (a + b) / 2;
  const lm = (a + m) / 2;
  const rm = (m + b) / 2;
  const flm = f(lm);
  const frm = f(rm);
  const left = simpson(f, a, m, fa, fm, flm);
  const right = simpson(f, m, b, fm, fb, frm);
  const sum = left + right;
  if (depth >= maxDepth || Math.abs(sum - whole) <= 15 * tol) {
    return sum + (sum - whole) / 15;
  }
  return (
    recurse(f, a, m, fa, fm, flm, left, tol / 2, depth + 1, maxDepth) +
    recurse(f, m, b, fm, fb, frm, right, tol / 2, depth + 1, maxDepth)
  );
}

export interface AdaptiveSimpsonOptions {
  tol?: number;
  maxDepth?: number;
}

export function adaptiveSimpson(
  f: (x: number) => number,
  a: number,
  b: number,
  options: AdaptiveSimpsonOptions = {},
): number {
  if (typeof f !== 'function') throw new Error('adaptiveSimpson: f must be a function');
  if (!Number.isFinite(a) || !Number.isFinite(b))
    throw new Error('adaptiveSimpson: bounds must be finite');
  if (a === b) return 0;
  const tol = options.tol ?? 1e-10;
  const maxDepth = options.maxDepth ?? 30;
  if (tol <= 0) throw new Error('adaptiveSimpson: tol must be positive');
  if (!Number.isInteger(maxDepth) || maxDepth <= 0)
    throw new Error('adaptiveSimpson: maxDepth must be positive integer');
  const sign = b > a ? 1 : -1;
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const fa = f(lo);
  const fb = f(hi);
  const m = (lo + hi) / 2;
  const fm = f(m);
  const whole = simpson(f, lo, hi, fa, fb, fm);
  const result = recurse(f, lo, hi, fa, fb, fm, whole, tol, 0, maxDepth);
  return sign * result;
}
