// Element-wise leaky ReLU on a numeric vector: y[i] = x[i] if x[i] >= 0 else alpha * x[i].
// Default slope alpha = 0.01.

export function leakyReluVector(x: number[], alpha: number = 0.01): number[] {
  if (!Array.isArray(x)) throw new Error('leakyReluVector: array required');
  if (!Number.isFinite(alpha)) throw new Error('leakyReluVector: alpha must be finite');
  const out = new Array(x.length);
  for (let i = 0; i < x.length; i++) {
    const v = x[i];
    if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error('leakyReluVector: non-finite entry');
    out[i] = v >= 0 ? v : alpha * v;
  }
  return out;
}
