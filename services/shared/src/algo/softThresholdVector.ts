// Element-wise soft-thresholding (proximal operator of lambda * ||x||_1):
//   softThreshold(x, lambda)[i] = sign(x[i]) * max(|x[i]| - lambda, 0)

export function softThresholdVector(x: number[], lambda: number): number[] {
  if (!Array.isArray(x)) throw new Error('softThresholdVector: array required');
  if (!Number.isFinite(lambda) || lambda < 0) throw new Error('softThresholdVector: lambda must be non-negative finite');
  const out = new Array(x.length);
  for (let i = 0; i < x.length; i++) {
    const v = x[i];
    if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error('softThresholdVector: non-finite entry');
    const ax = Math.abs(v);
    if (ax <= lambda) out[i] = 0;
    else out[i] = v > 0 ? v - lambda : v + lambda;
  }
  return out;
}
