// Introsort: quicksort with median-of-three pivot, switches to heapsort when
// recursion depth exceeds 2*log2(n), and falls through to insertion sort for
// small partitions.

function insertionSort<T>(a: T[], lo: number, hi: number, cmp: (x: T, y: T) => number): void {
  for (let i = lo + 1; i < hi; i += 1) {
    const v = a[i];
    let j = i;
    while (j > lo && cmp(a[j - 1], v) > 0) {
      a[j] = a[j - 1];
      j -= 1;
    }
    a[j] = v;
  }
}

function siftDown<T>(a: T[], start: number, end: number, cmp: (x: T, y: T) => number): void {
  let root = start;
  while (true) {
    const child = 2 * root + 1;
    if (child >= end) break;
    let swap = root;
    if (cmp(a[swap], a[child]) < 0) swap = child;
    if (child + 1 < end && cmp(a[swap], a[child + 1]) < 0) swap = child + 1;
    if (swap === root) return;
    [a[root], a[swap]] = [a[swap], a[root]];
    root = swap;
  }
}

function heapSort<T>(a: T[], lo: number, hi: number, cmp: (x: T, y: T) => number): void {
  const n = hi - lo;
  // build heap on a[lo..hi)
  for (let i = Math.floor(n / 2) - 1; i >= 0; i -= 1) {
    siftDown(a, lo + i, hi, cmp);
  }
  // Need a sift relative to lo; easier: extract by repeated removal
  // Rebuild via classic heap operations on the subarray treated 0-based
  // Implement a temp slice for clarity
  const slice = a.slice(lo, hi);
  for (let i = Math.floor(slice.length / 2) - 1; i >= 0; i -= 1) {
    siftDownLocal(slice, i, slice.length, cmp);
  }
  for (let end = slice.length - 1; end > 0; end -= 1) {
    [slice[0], slice[end]] = [slice[end], slice[0]];
    siftDownLocal(slice, 0, end, cmp);
  }
  for (let i = 0; i < slice.length; i += 1) a[lo + i] = slice[i];
}

function siftDownLocal<T>(a: T[], start: number, end: number, cmp: (x: T, y: T) => number): void {
  let root = start;
  while (true) {
    const child = 2 * root + 1;
    if (child >= end) break;
    let swap = root;
    if (cmp(a[swap], a[child]) < 0) swap = child;
    if (child + 1 < end && cmp(a[swap], a[child + 1]) < 0) swap = child + 1;
    if (swap === root) return;
    [a[root], a[swap]] = [a[swap], a[root]];
    root = swap;
  }
}

function medianOfThree<T>(a: T[], lo: number, hi: number, cmp: (x: T, y: T) => number): T {
  const mid = (lo + hi) >> 1;
  const last = hi - 1;
  if (cmp(a[lo], a[mid]) > 0) [a[lo], a[mid]] = [a[mid], a[lo]];
  if (cmp(a[lo], a[last]) > 0) [a[lo], a[last]] = [a[last], a[lo]];
  if (cmp(a[mid], a[last]) > 0) [a[mid], a[last]] = [a[last], a[mid]];
  return a[mid];
}

function partition<T>(a: T[], lo: number, hi: number, pivot: T, cmp: (x: T, y: T) => number): number {
  let i = lo;
  let j = hi - 1;
  while (true) {
    while (cmp(a[i], pivot) < 0) i += 1;
    while (cmp(a[j], pivot) > 0) j -= 1;
    if (i >= j) return i;
    [a[i], a[j]] = [a[j], a[i]];
    i += 1;
    j -= 1;
  }
}

function introSortRec<T>(a: T[], lo: number, hi: number, depth: number, cmp: (x: T, y: T) => number): void {
  const SIZE_THRESHOLD = 16;
  while (hi - lo > SIZE_THRESHOLD) {
    if (depth === 0) {
      heapSort(a, lo, hi, cmp);
      return;
    }
    const pivot = medianOfThree(a, lo, hi, cmp);
    const p = partition(a, lo, hi, pivot, cmp);
    introSortRec(a, p, hi, depth - 1, cmp);
    // tail call elimination
    // continue with left
    // eslint-disable-next-line no-param-reassign
    hi = p;
    depth -= 1;
  }
  insertionSort(a, lo, hi, cmp);
}

export function introSort<T>(values: readonly T[], cmp: (a: T, b: T) => number = (a, b) => (a < b ? -1 : a > b ? 1 : 0)): T[] {
  const a = values.slice();
  const n = a.length;
  if (n < 2) return a;
  const maxDepth = Math.floor(Math.log2(n)) * 2;
  introSortRec(a, 0, n, maxDepth, cmp);
  return a;
}
