/**
 * Median-of-medians selection: deterministic O(n) selection of the k-th
 * smallest element (0-indexed). Throws on bad inputs.
 */
function insertionSortInPlace(a: number[], lo: number, hi: number) {
  for (let i = lo + 1; i <= hi; i++) {
    const v = a[i];
    let j = i - 1;
    while (j >= lo && a[j] > v) {
      a[j + 1] = a[j];
      j--;
    }
    a[j + 1] = v;
  }
}

function pivotMedianOfMedians(a: number[], lo: number, hi: number): number {
  const n = hi - lo + 1;
  if (n <= 5) {
    insertionSortInPlace(a, lo, hi);
    return a[lo + Math.floor(n / 2)];
  }
  const medians: number[] = [];
  for (let i = lo; i <= hi; i += 5) {
    const sub = Math.min(i + 4, hi);
    insertionSortInPlace(a, i, sub);
    medians.push(a[i + Math.floor((sub - i) / 2)]);
  }
  return select(medians, 0, medians.length - 1, Math.floor(medians.length / 2));
}

function partition(a: number[], lo: number, hi: number, pivot: number): number {
  let pivotIdx = lo;
  for (let i = lo; i <= hi; i++) if (a[i] === pivot) { pivotIdx = i; break; }
  [a[pivotIdx], a[hi]] = [a[hi], a[pivotIdx]];
  let store = lo;
  for (let i = lo; i < hi; i++) {
    if (a[i] < pivot) {
      [a[store], a[i]] = [a[i], a[store]];
      store++;
    }
  }
  [a[store], a[hi]] = [a[hi], a[store]];
  return store;
}

function select(a: number[], lo: number, hi: number, k: number): number {
  while (true) {
    if (lo === hi) return a[lo];
    const pivot = pivotMedianOfMedians(a, lo, hi);
    const idx = partition(a, lo, hi, pivot);
    if (k === idx) return a[idx];
    if (k < idx) hi = idx - 1;
    else lo = idx + 1;
  }
}

export function medianOfMedians(values: number[], k: number): number {
  if (!Array.isArray(values)) throw new Error('medianOfMedians: values must be array');
  if (values.length === 0) throw new Error('medianOfMedians: empty input');
  if (!Number.isInteger(k) || k < 0 || k >= values.length) {
    throw new Error('medianOfMedians: k out of range');
  }
  for (const v of values) {
    if (!Number.isFinite(v)) throw new Error('medianOfMedians: non-finite');
  }
  const a = values.slice();
  return select(a, 0, a.length - 1, k);
}
