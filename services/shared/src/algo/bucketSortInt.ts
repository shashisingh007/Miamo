export function bucketSortInt(values: number[]): number[] {
  if (values.length === 0) return [];
  for (const v of values) {
    if (!Number.isInteger(v)) {
      throw new TypeError('values must all be integers');
    }
  }
  let min = values[0];
  let max = values[0];
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const size = max - min + 1;
  const counts = new Array<number>(size).fill(0);
  for (const v of values) counts[v - min] += 1;
  const out: number[] = new Array<number>(values.length);
  let idx = 0;
  for (let i = 0; i < size; i += 1) {
    for (let k = 0; k < counts[i]; k += 1) {
      out[idx] = i + min;
      idx += 1;
    }
  }
  return out;
}
