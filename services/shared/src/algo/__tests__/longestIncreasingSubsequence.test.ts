import { describe, it, expect } from 'vitest';
import { longestIncreasingSubsequence, lisLength } from '../longestIncreasingSubsequence';

function isStrictlyIncreasing(a: number[]) {
  for (let i = 1; i < a.length; i++) if (a[i] <= a[i - 1]) return false;
  return true;
}

describe('longestIncreasingSubsequence', () => {
  it('empty', () => {
    const r = longestIncreasingSubsequence([]);
    expect(r.length).toBe(0);
    expect(r.indices).toEqual([]);
    expect(r.values).toEqual([]);
  });

  it('single element', () => {
    const r = longestIncreasingSubsequence([42]);
    expect(r.length).toBe(1);
    expect(r.values).toEqual([42]);
  });

  it('strictly increasing input', () => {
    const r = longestIncreasingSubsequence([1, 2, 3, 4, 5]);
    expect(r.length).toBe(5);
    expect(r.values).toEqual([1, 2, 3, 4, 5]);
  });

  it('strictly decreasing input', () => {
    const r = longestIncreasingSubsequence([5, 4, 3, 2, 1]);
    expect(r.length).toBe(1);
  });

  it('classic example', () => {
    // [10,9,2,5,3,7,101,18] => length 4
    const r = longestIncreasingSubsequence([10, 9, 2, 5, 3, 7, 101, 18]);
    expect(r.length).toBe(4);
    expect(isStrictlyIncreasing(r.values)).toBe(true);
  });

  it('values match indices', () => {
    const arr = [10, 9, 2, 5, 3, 7, 101, 18];
    const r = longestIncreasingSubsequence(arr);
    expect(r.values).toEqual(r.indices.map((i) => arr[i]));
  });

  it('indices are increasing', () => {
    const r = longestIncreasingSubsequence([10, 9, 2, 5, 3, 7, 101, 18]);
    for (let i = 1; i < r.indices.length; i++) expect(r.indices[i]).toBeGreaterThan(r.indices[i - 1]);
  });

  it('strict rejects equal', () => {
    const r = longestIncreasingSubsequence([1, 1, 1, 1], true);
    expect(r.length).toBe(1);
  });

  it('non-strict allows equal', () => {
    const r = longestIncreasingSubsequence([1, 1, 1, 1], false);
    expect(r.length).toBe(4);
  });

  it('non-strict with mix', () => {
    const r = longestIncreasingSubsequence([1, 2, 2, 3], false);
    expect(r.length).toBe(4);
  });

  it('negatives', () => {
    const r = longestIncreasingSubsequence([-5, -3, -4, -1, 0]);
    expect(r.length).toBe(4);
  });

  it('lisLength helper', () => {
    expect(lisLength([0, 8, 4, 12, 2, 10, 6, 14, 1, 9])).toBe(4);
  });

  it('result is valid increasing subseq', () => {
    const arr = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5];
    const r = longestIncreasingSubsequence(arr);
    expect(isStrictlyIncreasing(r.values)).toBe(true);
  });

  it('handles duplicates strict', () => {
    const r = longestIncreasingSubsequence([2, 2, 3, 3, 4]);
    expect(r.length).toBe(3);
  });

  it('large random consistency', () => {
    const arr: number[] = [];
    let seed = 12345;
    for (let i = 0; i < 200; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      arr.push(seed % 1000);
    }
    const r = longestIncreasingSubsequence(arr);
    expect(isStrictlyIncreasing(r.values)).toBe(true);
    expect(r.length).toBeGreaterThanOrEqual(1);
  });
});
