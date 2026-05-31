// TimSort-like: identifies natural runs, ensures min run length via insertion
// sort on short prefixes, and merges runs using a stack.

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

function countRun<T>(a: T[], lo: number, hi: number, cmp: (x: T, y: T) => number): number {
  if (hi - lo <= 1) return hi - lo;
  let i = lo + 1;
  if (cmp(a[i], a[i - 1]) < 0) {
    while (i < hi && cmp(a[i], a[i - 1]) < 0) i += 1;
    // reverse the descending run to make ascending
    let l = lo;
    let r = i - 1;
    while (l < r) {
      [a[l], a[r]] = [a[r], a[l]];
      l += 1;
      r -= 1;
    }
  } else {
    while (i < hi && cmp(a[i], a[i - 1]) >= 0) i += 1;
  }
  return i - lo;
}

function mergeAt<T>(a: T[], lo: number, mid: number, hi: number, cmp: (x: T, y: T) => number): void {
  const left = a.slice(lo, mid);
  let i = 0;
  let j = mid;
  let k = lo;
  while (i < left.length && j < hi) {
    if (cmp(left[i], a[j]) <= 0) {
      a[k++] = left[i++];
    } else {
      a[k++] = a[j++];
    }
  }
  while (i < left.length) a[k++] = left[i++];
}

const MIN_RUN = 32;

function minRunLength(n: number): number {
  let r = 0;
  while (n >= MIN_RUN) {
    r |= n & 1;
    n >>= 1;
  }
  return n + r;
}

export function timSortLike<T>(values: readonly T[], cmp: (a: T, b: T) => number = (a, b) => (a < b ? -1 : a > b ? 1 : 0)): T[] {
  const a = values.slice();
  const n = a.length;
  if (n < 2) return a;
  const minRun = minRunLength(n);
  type RunRange = { base: number; len: number };
  const stack: RunRange[] = [];
  let lo = 0;
  while (lo < n) {
    let runLen = countRun(a, lo, n, cmp);
    if (runLen < minRun) {
      const forced = Math.min(n - lo, minRun);
      insertionSort(a, lo, lo + forced, cmp);
      runLen = forced;
    }
    stack.push({ base: lo, len: runLen });
    lo += runLen;
    // merge collapse: ensure A > B + C and B > C
    while (stack.length >= 2) {
      const sz = stack.length;
      if (sz >= 3 && stack[sz - 3].len <= stack[sz - 2].len + stack[sz - 1].len) {
        const idx = stack[sz - 3].len < stack[sz - 1].len ? sz - 3 : sz - 2;
        mergeRunsAt(idx);
      } else if (stack[sz - 2].len <= stack[sz - 1].len) {
        mergeRunsAt(sz - 2);
      } else {
        break;
      }
    }
  }
  // final collapse
  while (stack.length >= 2) mergeRunsAt(stack.length - 2);
  return a;

  function mergeRunsAt(idx: number) {
    const r1 = stack[idx];
    const r2 = stack[idx + 1];
    mergeAt(a, r1.base, r1.base + r1.len, r1.base + r1.len + r2.len, cmp);
    r1.len = r1.len + r2.len;
    stack.splice(idx + 1, 1);
  }
}
