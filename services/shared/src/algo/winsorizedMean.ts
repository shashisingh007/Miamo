/**
 * Winsorized mean: replace the top alpha and bottom alpha quantiles with the
 * boundary values, then take the mean. alpha in [0, 0.5).
 */
export function winsorizedMean(values: number[], alpha: number): number {
  if (!Array.isArray(values)) throw new Error('winsorizedMean: values must be array');
  if (values.length === 0) throw new Error('winsorizedMean: empty input');
  if (!Number.isFinite(alpha) || alpha < 0 || alpha >= 0.5) {
    throw new Error('winsorizedMean: alpha must be in [0, 0.5)');
  }
  for (const v of values) {
    if (!Number.isFinite(v)) throw new Error('winsorizedMean: non-finite');
  }
  const sorted = values.slice().sort((a, b) => a - b);
  const n = sorted.length;
  const k = Math.floor(alpha * n);
  const lo = sorted[k];
  const hi = sorted[n - 1 - k];
  let sum = 0;
  for (let i = 0; i < n; i++) {
    if (i < k) sum += lo;
    else if (i > n - 1 - k) sum += hi;
    else sum += sorted[i];
  }
  return sum / n;
}
