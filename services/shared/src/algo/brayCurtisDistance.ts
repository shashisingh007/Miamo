export function brayCurtisDistance(a: readonly number[], b: readonly number[]): number {
  if (a.length === 0) throw new Error('vectors must be non-empty');
  if (a.length !== b.length) throw new Error('vector length mismatch');
  let num = 0;
  let den = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('entries must be finite');
    if (x < 0 || y < 0) throw new Error('entries must be non-negative');
    num += Math.abs(x - y);
    den += x + y;
  }
  if (den === 0) throw new Error('both vectors are all zeros');
  return num / den;
}
