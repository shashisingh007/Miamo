import { describe, it, expect } from 'vitest';
import { segmentTreeLazy, SegmentTreeLazy } from '../segmentTreeLazy';

describe('segmentTreeLazy', () => {
  it('factory + class', () => {
    expect(segmentTreeLazy([1, 2, 3]) instanceof SegmentTreeLazy).toBe(true);
  });

  it('initial sum matches array', () => {
    const t = segmentTreeLazy([1, 2, 3, 4, 5]);
    expect(t.rangeSum(0, 4)).toBe(15);
    expect(t.rangeSum(1, 3)).toBe(9);
  });

  it('rangeAdd updates sum', () => {
    const t = segmentTreeLazy([1, 2, 3, 4, 5]);
    t.rangeAdd(1, 3, 10);
    expect(t.rangeSum(0, 4)).toBe(15 + 30);
    expect(t.rangeSum(1, 3)).toBe(9 + 30);
  });

  it('pointQuery', () => {
    const t = segmentTreeLazy([5, 5, 5]);
    t.rangeAdd(0, 2, 1);
    expect(t.pointQuery(0)).toBe(6);
    expect(t.pointQuery(1)).toBe(6);
    expect(t.pointQuery(2)).toBe(6);
  });

  it('overlapping adds compose', () => {
    const t = segmentTreeLazy([0, 0, 0, 0]);
    t.rangeAdd(0, 2, 3);
    t.rangeAdd(1, 3, 2);
    expect(t.pointQuery(0)).toBe(3);
    expect(t.pointQuery(1)).toBe(5);
    expect(t.pointQuery(2)).toBe(5);
    expect(t.pointQuery(3)).toBe(2);
  });

  it('size constructor', () => {
    const t = segmentTreeLazy(4);
    expect(t.rangeSum(0, 3)).toBe(0);
    t.rangeAdd(0, 3, 7);
    expect(t.rangeSum(0, 3)).toBe(28);
  });

  it('empty input', () => {
    const t = segmentTreeLazy([]);
    expect(t.rangeSum(0, 0)).toBe(0);
  });

  it('throws on bad range', () => {
    const t = segmentTreeLazy([1, 2, 3]);
    expect(() => t.rangeSum(-1, 1)).toThrow();
    expect(() => t.rangeSum(0, 5)).toThrow();
    expect(() => t.rangeSum(2, 1)).toThrow();
  });

  it('throws on negative size', () => {
    expect(() => segmentTreeLazy(-1)).toThrow();
  });

  it('large random workload', () => {
    const n = 200;
    const arr = new Array<number>(n).fill(0);
    const t = segmentTreeLazy(n);
    for (let i = 0; i < 500; i += 1) {
      const l = Math.floor(Math.random() * n);
      const r = l + Math.floor(Math.random() * (n - l));
      const v = Math.floor(Math.random() * 10) - 5;
      if (i % 2 === 0) {
        t.rangeAdd(l, r, v);
        for (let j = l; j <= r; j += 1) arr[j] += v;
      } else {
        let s = 0;
        for (let j = l; j <= r; j += 1) s += arr[j];
        expect(t.rangeSum(l, r)).toBe(s);
      }
    }
  });

  it('single element ops', () => {
    const t = segmentTreeLazy([10]);
    expect(t.rangeSum(0, 0)).toBe(10);
    t.rangeAdd(0, 0, -3);
    expect(t.pointQuery(0)).toBe(7);
  });
});
