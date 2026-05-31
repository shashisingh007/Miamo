/**
 * Gini coefficient for a non-negative array of values.
 * Returns a number in [0, 1] where 0 is perfect equality.
 * Uses the sorted formula: G = (2 * sum_{i=1..n} i*x_i) / (n * sum(x)) - (n+1)/n
 */
export function giniCoefficient(values: number[]): number {
  if (!Array.isArray(values)) throw new Error('giniCoefficient: values must be array');
  if (values.length === 0) throw new Error('giniCoefficient: empty input');
  for (const v of values) {
    if (!Number.isFinite(v)) throw new Error('giniCoefficient: non-finite');
    if (v < 0) throw new Error('giniCoefficient: negative value');
  }
  const sorted = values.slice().sort((a, b) => a - b);
  const n = sorted.length;
  let sum = 0;
  let weighted = 0;
  for (let i = 0; i < n; i++) {
    sum += sorted[i];
    weighted += (i + 1) * sorted[i];
  }
  if (sum === 0) return 0;
  return (2 * weighted) / (n * sum) - (n + 1) / n;
}
