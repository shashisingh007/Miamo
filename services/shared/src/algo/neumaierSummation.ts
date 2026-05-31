export function neumaierSummation(values: Iterable<number>): number {
  let sum = 0;
  let c = 0;
  let started = false;
  for (const v of values) {
    if (!Number.isFinite(v)) {
      throw new Error('neumaierSummation: non-finite value');
    }
    if (!started) {
      sum = v;
      started = true;
      continue;
    }
    const t = sum + v;
    if (Math.abs(sum) >= Math.abs(v)) {
      c += (sum - t) + v;
    } else {
      c += (v - t) + sum;
    }
    sum = t;
  }
  return sum + c;
}
