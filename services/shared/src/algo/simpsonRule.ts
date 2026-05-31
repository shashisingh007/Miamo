// Composite Simpson's rule for definite integration. n must be even.

export function simpsonRule(
  f: (x: number) => number,
  a: number,
  b: number,
  n = 100
): number {
  if (!Number.isInteger(n) || n <= 0) {
    throw new RangeError('n must be a positive integer');
  }
  if (n % 2 !== 0) throw new RangeError('n must be even');
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    throw new RangeError('bounds must be finite');
  }
  if (a === b) return 0;
  const h = (b - a) / n;
  let sum = f(a) + f(b);
  for (let i = 1; i < n; i++) {
    const x = a + i * h;
    sum += (i % 2 === 0 ? 2 : 4) * f(x);
  }
  return (h / 3) * sum;
}
