export function tanimotoCoefficient(a: readonly number[], b: readonly number[]): number {
  if (a.length === 0) throw new Error('vectors must be non-empty');
  if (a.length !== b.length) throw new Error('vector length mismatch');
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('entries must be finite');
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  const denom = na + nb - dot;
  if (denom === 0) throw new Error('both vectors are zero');
  return dot / denom;
}

export function tanimotoDistance(a: readonly number[], b: readonly number[]): number {
  return 1 - tanimotoCoefficient(a, b);
}
