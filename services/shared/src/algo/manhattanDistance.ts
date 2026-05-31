export function manhattanDistance(a: readonly number[], b: readonly number[]): number {
  if (a.length === 0) throw new Error('vectors must be non-empty');
  if (a.length !== b.length) throw new Error('vector length mismatch');
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('entries must be finite');
    s += Math.abs(x - y);
  }
  return s;
}
