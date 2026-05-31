// Weighted quantile of a numeric sample. Each value has a non-negative weight.
// Returns the value at the given quantile q in [0,1] using linear interpolation
// between adjacent weighted CDF entries.

export function weightedQuantile(values: number[], weights: number[], q: number): number {
  const n = values.length;
  if (n === 0) throw new Error('weightedQuantile: empty');
  if (weights.length !== n) throw new Error('weightedQuantile: length mismatch');
  if (!(q >= 0 && q <= 1)) throw new Error('weightedQuantile: q must be in [0,1]');
  let totalW = 0;
  for (const w of weights) {
    if (w < 0 || !Number.isFinite(w)) throw new Error('weightedQuantile: invalid weight');
    totalW += w;
  }
  if (totalW <= 0) throw new Error('weightedQuantile: total weight zero');

  const idx = Array.from({ length: n }, (_, i) => i);
  idx.sort((a, b) => values[a] - values[b]);

  const target = q * totalW;
  let cum = 0;
  let prevCum = 0;
  for (let k = 0; k < n; k++) {
    const i = idx[k];
    const w = weights[i];
    if (w === 0) continue;
    cum += w;
    if (cum >= target) {
      // Linear interpolation between previous and current
      if (k === 0 || prevCum === cum - w) {
        // First weighted item or no overlap available
        if (k > 0 && cum > target && prevCum < target && weights[idx[k - 1]] > 0) {
          const xPrev = values[idx[k - 1]];
          const xCur = values[i];
          const t = (target - prevCum) / (cum - prevCum);
          return xPrev + t * (xCur - xPrev);
        }
        return values[i];
      }
      const xPrev = values[idx[k - 1]];
      const xCur = values[i];
      const t = (target - prevCum) / (cum - prevCum);
      return xPrev + t * (xCur - xPrev);
    }
    prevCum = cum;
  }
  return values[idx[n - 1]];
}
