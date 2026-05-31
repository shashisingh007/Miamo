import { describe, it, expect } from 'vitest';
import {
  buildCartesianTreeMinHeap,
  inorderTraversal,
  rangeMinIndex,
} from '../cartesianTreeBuilder';

describe('cartesianTreeBuilder', () => {
  it('empty array => null', () => {
    expect(buildCartesianTreeMinHeap([])).toBeNull();
  });

  it('single element', () => {
    const t = buildCartesianTreeMinHeap([42])!;
    expect(t.value).toBe(42);
    expect(t.left).toBeNull();
    expect(t.right).toBeNull();
  });

  it('root is min', () => {
    const t = buildCartesianTreeMinHeap([3, 1, 4, 1, 5, 9, 2, 6])!;
    expect(t.value).toBe(1);
  });

  it('inorder yields original index order', () => {
    const arr = [3, 1, 4, 1, 5, 9, 2, 6];
    const t = buildCartesianTreeMinHeap(arr);
    expect(inorderTraversal(t)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('min-heap property holds', () => {
    const arr = [5, 2, 7, 3, 1, 8, 4];
    const t = buildCartesianTreeMinHeap(arr);
    const ok = (n: any): boolean => {
      if (n === null) return true;
      if (n.left !== null && n.left.value < n.value) return false;
      if (n.right !== null && n.right.value < n.value) return false;
      return ok(n.left) && ok(n.right);
    };
    expect(ok(t)).toBe(true);
  });

  it('rangeMinIndex full range', () => {
    const arr = [3, 1, 4, 1, 5, 9, 2, 6];
    const t = buildCartesianTreeMinHeap(arr);
    expect(rangeMinIndex(t, 0, arr.length - 1)).toBe(1);
  });

  it('rangeMinIndex partial range', () => {
    const arr = [3, 1, 4, 1, 5, 9, 2, 6];
    const t = buildCartesianTreeMinHeap(arr);
    expect(rangeMinIndex(t, 4, 7)).toBe(6);
  });

  it('rangeMinIndex single index', () => {
    const arr = [5, 2, 7];
    const t = buildCartesianTreeMinHeap(arr);
    expect(rangeMinIndex(t, 0, 0)).toBe(0);
  });

  it('throws when tree empty', () => {
    expect(() => rangeMinIndex(null, 0, 0)).toThrow(RangeError);
  });

  it('throws when lo > hi', () => {
    const t = buildCartesianTreeMinHeap([1]);
    expect(() => rangeMinIndex(t, 1, 0)).toThrow(RangeError);
  });

  it('strictly ascending input forms right-spine', () => {
    const t = buildCartesianTreeMinHeap([1, 2, 3, 4, 5])!;
    let cur: any = t;
    let count = 0;
    while (cur !== null) { count++; expect(cur.left).toBeNull(); cur = cur.right; }
    expect(count).toBe(5);
  });

  it('strictly descending input forms left-spine', () => {
    const t = buildCartesianTreeMinHeap([5, 4, 3, 2, 1])!;
    expect(t.value).toBe(1);
    expect(t.right).toBeNull();
  });

  it('range min matches brute force', () => {
    const arr = [4, 6, 1, 3, 7, 2, 5, 8, 0, 9];
    const t = buildCartesianTreeMinHeap(arr);
    for (let lo = 0; lo < arr.length; lo++) {
      for (let hi = lo; hi < arr.length; hi++) {
        let bestI = lo;
        for (let k = lo + 1; k <= hi; k++) if (arr[k] < arr[bestI]) bestI = k;
        expect(rangeMinIndex(t, lo, hi)).toBe(bestI);
      }
    }
  });

  it('ties broken by earliest index (build)', () => {
    const t = buildCartesianTreeMinHeap([2, 1, 1, 2])!;
    expect(t.value).toBe(1);
    expect(t.index).toBe(1);
  });
});
