/**
 * Composite Simpson's 1/3 rule for numerical integration.
 * Requires an even number of subintervals; rounds odd `n` up to next even.
 */

export interface SimpsonOptions {
  n?: number; // number of subintervals; default 100, forced even
}

export function simpsonsRule(
  f: (x: number) => number,
  a: number,
  b: number,
  opts: SimpsonOptions = {},
): number {
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    throw new RangeError('a and b must be finite');
  }
  if (a === b) return 0;
  let n = opts.n ?? 100;
  if (!Number.isInteger(n) || n <= 0) throw new RangeError('n must be a positive integer');
  if (n % 2 === 1) n += 1;
  const h = (b - a) / n;
  let sum = f(a) + f(b);
  for (let i = 1; i < n; i++) {
    const x = a + i * h;
    const fx = f(x);
    if (!Number.isFinite(fx)) throw new RangeError('f returned non-finite value');
    sum += (i % 2 === 0 ? 2 : 4) * fx;
  }
  return (h / 3) * sum;
}

/**
 * Adaptive Simpson — recursive subdivision until error tolerance is met.
 */
export function adaptiveSimpson(
  f: (x: number) => number,
  a: number,
  b: number,
  tol = 1e-9,
  maxDepth = 25,
): number {
  function simp(lo: number, hi: number): number {
    const m = (lo + hi) / 2;
    return ((hi - lo) / 6) * (f(lo) + 4 * f(m) + f(hi));
  }
  function rec(lo: number, hi: number, whole: number, depth: number): number {
    const m = (lo + hi) / 2;
    const left = simp(lo, m);
    const right = simp(m, hi);
    const diff = left + right - whole;
    if (depth <= 0 || Math.abs(diff) < 15 * tol) return left + right + diff / 15;
    return rec(lo, m, left, depth - 1) + rec(m, hi, right, depth - 1);
  }
  return rec(a, b, simp(a, b), maxDepth);
}
