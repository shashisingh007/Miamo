/**
 * Trimmed mean: mean after removing a fraction (0 <= alpha < 0.5) from each tail.
 * Returns the arithmetic mean of values in [floor(alpha*n), n - floor(alpha*n)) after sort.
 */
export function trimmedMean(values: number[], alpha: number): number {
  if (!Array.isArray(values)) throw new Error('trimmedMean: values must be array');
  if (values.length === 0) throw new Error('trimmedMean: empty input');
  if (!Number.isFinite(alpha) || alpha < 0 || alpha >= 0.5) {
    throw new Error('trimmedMean: alpha must be in [0, 0.5)');
  }
  for (const v of values) {
    if (!Number.isFinite(v)) throw new Error('trimmedMean: non-finite');
  }
  const sorted = values.slice().sort((a, b) => a - b);
  const n = sorted.length;
  const k = Math.floor(alpha * n);
  const lo = k;
  const hi = n - k;
  if (hi <= lo) return sorted[Math.floor(n / 2)];
  let sum = 0;
  for (let i = lo; i < hi; i++) sum += sorted[i];
  return sum / (hi - lo);
}
