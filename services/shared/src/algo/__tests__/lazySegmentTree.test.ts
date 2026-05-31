import { describe, it, expect } from 'vitest';
import { LazySegmentTree } from '../lazySegmentTree';

describe('LazySegmentTree', () => {
  it('rejects non-array', () => {
    expect(() => new LazySegmentTree('x' as any)).toThrow(TypeError);
  });

  it('rejects NaN', () => {
    expect(() => new LazySegmentTree([1, NaN])).toThrow(RangeError);
  });

  it('empty array supported', () => {
    const t = new LazySegmentTree([]);
    expect(t.size_()).toBe(0);
    expect(t.rangeSum(0, 0)).toBe(0);
  });

  it('single element', () => {
    const t = new LazySegmentTree([5]);
    expect(t.rangeSum(0, 1)).toBe(5);
    expect(t.pointGet(0)).toBe(5);
  });

  it('basic sum', () => {
    const t = new LazySegmentTree([1, 2, 3, 4, 5]);
    expect(t.rangeSum(0, 5)).toBe(15);
    expect(t.rangeSum(1, 4)).toBe(9);
    expect(t.rangeSum(0, 1)).toBe(1);
  });

  it('rangeAdd applies', () => {
    const t = new LazySegmentTree([1, 2, 3, 4, 5]);
    t.rangeAdd(1, 4, 10);
    expect(t.rangeSum(0, 5)).toBe(15 + 30);
    expect(t.pointGet(0)).toBe(1);
    expect(t.pointGet(1)).toBe(12);
    expect(t.pointGet(3)).toBe(14);
    expect(t.pointGet(4)).toBe(5);
  });

  it('rangeAdd half-open: rangeAdd(1, 1, 10) is no-op', () => {
    const t = new LazySegmentTree([1, 2, 3]);
    t.rangeAdd(1, 1, 10);
    expect(t.rangeSum(0, 3)).toBe(6);
  });

  it('multiple overlapping adds', () => {
    const t = new LazySegmentTree([0, 0, 0, 0, 0]);
    t.rangeAdd(0, 3, 1);
    t.rangeAdd(2, 5, 2);
    t.rangeAdd(1, 4, 3);
    // [1, 1+3, 1+2+3, 2+3, 2] = [1, 4, 6, 5, 2]; sum=18
    expect(t.pointGet(0)).toBe(1);
    expect(t.pointGet(1)).toBe(4);
    expect(t.pointGet(2)).toBe(6);
    expect(t.pointGet(3)).toBe(5);
    expect(t.pointGet(4)).toBe(2);
    expect(t.rangeSum(0, 5)).toBe(18);
  });

  it('negative delta', () => {
    const t = new LazySegmentTree([10, 10, 10]);
    t.rangeAdd(0, 3, -3);
    expect(t.rangeSum(0, 3)).toBe(21);
  });

  it('point get rejects out of bounds', () => {
    const t = new LazySegmentTree([1, 2]);
    expect(() => t.pointGet(-1)).toThrow(RangeError);
    expect(() => t.pointGet(2)).toThrow(RangeError);
  });

  it('rangeAdd rejects bad range', () => {
    const t = new LazySegmentTree([1, 2]);
    expect(() => t.rangeAdd(-1, 1, 1)).toThrow(RangeError);
    expect(() => t.rangeAdd(0, 3, 1)).toThrow(RangeError);
    expect(() => t.rangeAdd(2, 1, 1)).toThrow(RangeError);
  });

  it('rangeAdd rejects non-finite delta', () => {
    const t = new LazySegmentTree([1, 2]);
    expect(() => t.rangeAdd(0, 1, NaN)).toThrow(RangeError);
  });

  it('rangeSum rejects bad range', () => {
    const t = new LazySegmentTree([1, 2]);
    expect(() => t.rangeSum(-1, 1)).toThrow(RangeError);
    expect(() => t.rangeSum(0, 3)).toThrow(RangeError);
  });

  it('rangeSum non-integer rejected', () => {
    const t = new LazySegmentTree([1, 2]);
    expect(() => t.rangeSum(0.5, 1)).toThrow(TypeError);
  });

  it('matches brute force after random ops', () => {
    const n = 50;
    const arr = Array.from({ length: n }, (_, i) => i);
    const t = new LazySegmentTree(arr.slice());
    for (let op = 0; op < 200; op += 1) {
      let l = Math.floor(Math.random() * n);
      let r = Math.floor(Math.random() * n) + 1;
      if (l > r) { const tmp = l; l = r; r = tmp; }
      if (Math.random() < 0.5) {
        const d = Math.floor(Math.random() * 21) - 10;
        for (let i = l; i < r; i += 1) arr[i] += d;
        t.rangeAdd(l, r, d);
      } else {
        let expected = 0;
        for (let i = l; i < r; i += 1) expected += arr[i];
        expect(t.rangeSum(l, r)).toBe(expected);
      }
    }
  });

  it('handles n=1 with adds', () => {
    const t = new LazySegmentTree([7]);
    t.rangeAdd(0, 1, 3);
    expect(t.pointGet(0)).toBe(10);
  });

  it('large n', () => {
    const n = 1000;
    const t = new LazySegmentTree(new Array(n).fill(0));
    t.rangeAdd(0, n, 5);
    expect(t.rangeSum(0, n)).toBe(5 * n);
    t.rangeAdd(0, n / 2, 3);
    expect(t.rangeSum(0, n)).toBe(5 * n + 3 * (n / 2));
  });

  it('full-range query', () => {
    const t = new LazySegmentTree([1, 2, 3, 4]);
    t.rangeAdd(0, 4, 1);
    expect(t.rangeSum(0, 4)).toBe(14);
  });

  it('empty range query returns 0', () => {
    const t = new LazySegmentTree([1, 2, 3]);
    expect(t.rangeSum(1, 1)).toBe(0);
  });
});
