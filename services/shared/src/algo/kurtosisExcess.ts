/**
 * Excess kurtosis (sample, Fisher's definition): m4/m2^2 - 3.
 * For a Gaussian, returns 0. Requires at least 2 distinct values.
 */
export function kurtosisExcess(values: number[]): number {
  if (!Array.isArray(values)) throw new Error('kurtosisExcess: values must be array');
  if (values.length < 2) throw new Error('kurtosisExcess: need at least 2 values');
  for (const v of values) {
    if (!Number.isFinite(v)) throw new Error('kurtosisExcess: non-finite');
  }
  const n = values.length;
  let mean = 0;
  for (const v of values) mean += v;
  mean /= n;
  let m2 = 0;
  let m4 = 0;
  for (const v of values) {
    const d = v - mean;
    const d2 = d * d;
    m2 += d2;
    m4 += d2 * d2;
  }
  m2 /= n;
  m4 /= n;
  if (m2 === 0) return 0;
  return m4 / (m2 * m2) - 3;
}
