export function minkowskiDistance(
  a: readonly number[],
  b: readonly number[],
  p: number
): number {
  if (a.length === 0) throw new Error('vectors must be non-empty');
  if (a.length !== b.length) throw new Error('vector length mismatch');
  if (!Number.isFinite(p)) throw new Error('p must be finite');
  if (p < 1) throw new Error('p must be >= 1');
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('entries must be finite');
    s += Math.abs(x - y) ** p;
  }
  return s ** (1 / p);
}
