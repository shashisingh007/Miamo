export function kahanSummation(values: Iterable<number>): number {
  let sum = 0;
  let c = 0;
  for (const v of values) {
    if (!Number.isFinite(v)) {
      throw new Error('kahanSummation: non-finite value');
    }
    const y = v - c;
    const t = sum + y;
    c = t - sum - y;
    sum = t;
  }
  return sum;
}
