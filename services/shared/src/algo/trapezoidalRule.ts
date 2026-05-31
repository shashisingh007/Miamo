export function trapezoidalRule(
  f: (x: number) => number,
  a: number,
  b: number,
  n: number,
): number {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error('trapezoidalRule: n must be a positive integer');
  }
  if (a === b) return 0;
  const sign = b < a ? -1 : 1;
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const h = (hi - lo) / n;
  let sum = (f(lo) + f(hi)) / 2;
  for (let i = 1; i < n; i += 1) {
    sum += f(lo + i * h);
  }
  return sign * sum * h;
}

export interface AdaptiveTrapezoidOptions {
  tol?: number;
  maxIterations?: number;
}

export function adaptiveTrapezoid(
  f: (x: number) => number,
  a: number,
  b: number,
  opts: AdaptiveTrapezoidOptions = {},
): number {
  const tol = opts.tol ?? 1e-8;
  const maxIterations = opts.maxIterations ?? 20;
  if (a === b) return 0;
  let n = 1;
  let prev = trapezoidalRule(f, a, b, n);
  for (let i = 0; i < maxIterations; i += 1) {
    n *= 2;
    const curr = trapezoidalRule(f, a, b, n);
    if (Math.abs(curr - prev) < tol) return curr;
    prev = curr;
  }
  return prev;
}
