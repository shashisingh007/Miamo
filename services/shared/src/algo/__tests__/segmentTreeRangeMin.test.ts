import { describe, it, expect } from 'vitest';
import { SegmentTreeRangeMin } from '../segmentTreeRangeMin';

describe('SegmentTreeRangeMin', () => {
  it('builds from non-empty array', () => {
    const t = new SegmentTreeRangeMin([3, 1, 4, 1, 5, 9, 2, 6]);
    expect(t.size).toBe(8);
  });

  it('rejects empty', () => {
    expect(() => new SegmentTreeRangeMin([])).toThrow();
  });

  it('rejects non-array', () => {
    expect(() => new SegmentTreeRangeMin('abc' as any)).toThrow();
  });

  it('rejects non-finite values', () => {
    expect(() => new SegmentTreeRangeMin([1, NaN])).toThrow();
    expect(() => new SegmentTreeRangeMin([1, Infinity])).toThrow();
  });

  it('queryMin single element', () => {
    const t = new SegmentTreeRangeMin([3, 1, 4, 1, 5]);
    expect(t.queryMin(0, 1)).toBe(3);
    expect(t.queryMin(1, 2)).toBe(1);
  });

  it('queryMin full range', () => {
    const t = new SegmentTreeRangeMin([3, 1, 4, 1, 5, 9, 2, 6]);
    expect(t.queryMin(0, 8)).toBe(1);
  });

  it('queryMin partial range', () => {
    const t = new SegmentTreeRangeMin([3, 1, 4, 1, 5, 9, 2, 6]);
    expect(t.queryMin(4, 8)).toBe(2);
    expect(t.queryMin(2, 5)).toBe(1);
  });

  it('queryMin half-open semantics', () => {
    const t = new SegmentTreeRangeMin([5, 1, 5]);
    expect(t.queryMin(0, 1)).toBe(5); // just [0]
    expect(t.queryMin(0, 2)).toBe(1); // [0,1]
  });

  it('rejects invalid range', () => {
    const t = new SegmentTreeRangeMin([1, 2, 3]);
    expect(() => t.queryMin(0, 0)).toThrow();
    expect(() => t.queryMin(2, 1)).toThrow();
    expect(() => t.queryMin(-1, 2)).toThrow();
    expect(() => t.queryMin(0, 5)).toThrow();
  });

  it('rejects non-integer range', () => {
    const t = new SegmentTreeRangeMin([1, 2, 3]);
    expect(() => t.queryMin(0.5, 2)).toThrow();
  });

  it('update changes value', () => {
    const t = new SegmentTreeRangeMin([3, 1, 4, 7, 5]);
    t.update(1, 100);
    expect(t.queryMin(0, 5)).toBe(3);
  });

  it('update propagates upward', () => {
    const t = new SegmentTreeRangeMin([3, 1, 4, 1, 5]);
    t.update(2, -10);
    expect(t.queryMin(0, 5)).toBe(-10);
  });

  it('update rejects out-of-range index', () => {
    const t = new SegmentTreeRangeMin([1, 2, 3]);
    expect(() => t.update(-1, 5)).toThrow();
    expect(() => t.update(3, 5)).toThrow();
    expect(() => t.update(1.5, 5)).toThrow();
  });

  it('update rejects non-finite value', () => {
    const t = new SegmentTreeRangeMin([1, 2, 3]);
    expect(() => t.update(0, NaN)).toThrow();
    expect(() => t.update(0, Infinity)).toThrow();
  });

  it('get(i) returns element', () => {
    const t = new SegmentTreeRangeMin([7, 8, 9]);
    expect(t.get(0)).toBe(7);
    expect(t.get(2)).toBe(9);
  });

  it('single-element tree', () => {
    const t = new SegmentTreeRangeMin([42]);
    expect(t.queryMin(0, 1)).toBe(42);
    t.update(0, -7);
    expect(t.queryMin(0, 1)).toBe(-7);
  });

  it('handles negative values', () => {
    const t = new SegmentTreeRangeMin([-1, -5, -3, -2]);
    expect(t.queryMin(0, 4)).toBe(-5);
  });

  it('handles many updates', () => {
    const arr = [10, 20, 30, 40, 50];
    const t = new SegmentTreeRangeMin(arr);
    for (let i = 0; i < arr.length; i++) t.update(i, arr[i] - 1);
    expect(t.queryMin(0, 5)).toBe(9);
  });

  it('matches naive on random ops', () => {
    const arr = [4, 2, 7, 1, 9, 3, 6, 5];
    const t = new SegmentTreeRangeMin(arr);
    for (let l = 0; l < arr.length; l++) {
      for (let r = l + 1; r <= arr.length; r++) {
        const naive = Math.min(...arr.slice(l, r));
        expect(t.queryMin(l, r)).toBe(naive);
      }
    }
  });

  it('large array stability', () => {
    const N = 256;
    const arr: number[] = [];
    for (let i = 0; i < N; i++) arr.push((i * 13 + 7) % 97);
    const t = new SegmentTreeRangeMin(arr);
    expect(t.queryMin(0, N)).toBe(Math.min(...arr));
  });
});
