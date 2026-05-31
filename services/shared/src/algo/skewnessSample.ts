/**
 * Sample skewness using Fisher-Pearson formula:
 *   g1 = (1/n * sum((x-mean)^3)) / sd^3
 * where sd is population standard deviation (1/n).
 */
export function skewnessSample(values: number[]): number {
  if (!Array.isArray(values)) throw new Error('skewnessSample: values must be array');
  if (values.length < 2) throw new Error('skewnessSample: need at least 2 values');
  for (const v of values) {
    if (!Number.isFinite(v)) throw new Error('skewnessSample: non-finite');
  }
  const n = values.length;
  let mean = 0;
  for (const v of values) mean += v;
  mean /= n;
  let m2 = 0;
  let m3 = 0;
  for (const v of values) {
    const d = v - mean;
    m2 += d * d;
    m3 += d * d * d;
  }
  m2 /= n;
  m3 /= n;
  if (m2 === 0) return 0;
  return m3 / Math.pow(m2, 1.5);
}
