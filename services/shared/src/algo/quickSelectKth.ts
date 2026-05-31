export function quickSelectKth<T>(
  values: T[],
  k: number,
  compare: (a: T, b: T) => number = (a, b) => (a < b ? -1 : a > b ? 1 : 0),
): T {
  if (values.length === 0) throw new RangeError('values must be non-empty');
  if (!Number.isInteger(k) || k < 0 || k >= values.length) {
    throw new RangeError('k out of range');
  }
  const arr = values.slice();
  let lo = 0;
  let hi = arr.length - 1;
  while (lo < hi) {
    const pivotIndex = (lo + hi) >>> 1;
    const pivot = arr[pivotIndex];
    [arr[pivotIndex], arr[hi]] = [arr[hi], arr[pivotIndex]];
    let store = lo;
    for (let i = lo; i < hi; i += 1) {
      if (compare(arr[i], pivot) < 0) {
        [arr[store], arr[i]] = [arr[i], arr[store]];
        store += 1;
      }
    }
    [arr[store], arr[hi]] = [arr[hi], arr[store]];
    if (store === k) return arr[store];
    if (store < k) lo = store + 1;
    else hi = store - 1;
  }
  return arr[lo];
}
