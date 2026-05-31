// Weighted median: smallest x[i] such that cumulative weight (sorted by x) >= total/2.
// Convention used by tests:
//   - Throws on empty input or length mismatch.
//   - Throws on negative weights or all-zero total weight.
//   - For even unweighted case, returns the lower-median element (cumulative >= half).

export function weightedMedian(values: number[], weights: number[]): number {
  if (!Array.isArray(values) || !Array.isArray(weights)) throw new Error('weightedMedian: arrays required');
  if (values.length === 0) throw new Error('weightedMedian: empty');
  if (values.length !== weights.length) throw new Error('weightedMedian: length mismatch');
  let total = 0;
  for (const w of weights) {
    if (!Number.isFinite(w) || w < 0) throw new Error('weightedMedian: weights must be non-negative finite');
    total += w;
  }
  if (total <= 0) throw new Error('weightedMedian: total weight must be positive');
  const idx = values.map((_, i) => i).sort((a, b) => values[a] - values[b]);
  const half = total / 2;
  let cum = 0;
  for (const i of idx) {
    cum += weights[i];
    if (cum >= half) return values[i];
  }
  return values[idx[idx.length - 1]];
}
