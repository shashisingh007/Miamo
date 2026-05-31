/**
 * Longest Increasing Subsequence — O(n log n) patience-sort.
 * Strictly increasing by default; pass strict=false for non-decreasing.
 */

export interface LisResult {
  length: number;
  indices: number[];
  values: number[];
}

export function longestIncreasingSubsequence(arr: readonly number[], strict = true): LisResult {
  const n = arr.length;
  if (n === 0) return { length: 0, indices: [], values: [] };
  // tails[i] = index in arr of the smallest tail value of an increasing subseq of length i+1
  const tails: number[] = [];
  const prev: number[] = new Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    const x = arr[i];
    // binary search for insertion point
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      const cmp = arr[tails[mid]];
      const less = strict ? cmp < x : cmp <= x;
      if (less) lo = mid + 1;
      else hi = mid;
    }
    if (lo > 0) prev[i] = tails[lo - 1];
    if (lo === tails.length) tails.push(i);
    else tails[lo] = i;
  }
  const length = tails.length;
  const indices: number[] = new Array(length);
  let k = tails[length - 1];
  for (let i = length - 1; i >= 0; i--) {
    indices[i] = k;
    k = prev[k];
  }
  const values = indices.map((i) => arr[i]);
  return { length, indices, values };
}

export function lisLength(arr: readonly number[], strict = true): number {
  return longestIncreasingSubsequence(arr, strict).length;
}
