import { describe, it, expect } from 'vitest';
import { segmentTreeBeats, SegmentTreeBeats } from '../segmentTreeBeats';

describe('segmentTreeBeats', () => {
  it('factory + class', () => {
    expect(segmentTreeBeats([1, 2, 3]) instanceof SegmentTreeBeats).toBe(true);
  });

  it('initial sum', () => {
    const t = segmentTreeBeats([1, 2, 3, 4, 5]);
    expect(t.rangeSum(0, 4)).toBe(15);
    expect(t.rangeSum(1, 3)).toBe(9);
  });

  it('rangeAdd', () => {
    const t = segmentTreeBeats([1, 2, 3, 4, 5]);
    t.rangeAdd(0, 4, 10);
    expect(t.rangeSum(0, 4)).toBe(65);
  });

  it('rangeChmin clamps maxima', () => {
    const t = segmentTreeBeats([5, 7, 3, 9, 2]);
    t.rangeChmin(0, 4, 4);
    expect(t.rangeSum(0, 4)).toBe(4 + 4 + 3 + 4 + 2);
  });

  it('chmin no-op when v >= max', () => {
    const t = segmentTreeBeats([1, 2, 3]);
    t.rangeChmin(0, 2, 100);
    expect(t.rangeSum(0, 2)).toBe(6);
  });

  it('combined add + chmin', () => {
    const t = segmentTreeBeats([1, 2, 3, 4, 5]);
    t.rangeAdd(0, 4, 1);          // 2 3 4 5 6
    t.rangeChmin(0, 4, 4);        // 2 3 4 4 4
    expect(t.rangeSum(0, 4)).toBe(2 + 3 + 4 + 4 + 4);
  });

  it('empty input ok', () => {
    const t = segmentTreeBeats([]);
    expect(t.rangeSum(0, 0)).toBe(0);
  });

  it('throws on bad range', () => {
    const t = segmentTreeBeats([1, 2, 3]);
    expect(() => t.rangeSum(-1, 1)).toThrow();
    expect(() => t.rangeAdd(0, 5, 1)).toThrow();
    expect(() => t.rangeChmin(2, 1, 1)).toThrow();
  });

  it('partial range chmin', () => {
    const t = segmentTreeBeats([10, 10, 10, 10]);
    t.rangeChmin(1, 2, 5);
    expect(t.rangeSum(0, 3)).toBe(10 + 5 + 5 + 10);
  });

  it('matches brute force on random workload', () => {
    const n = 60;
    const arr: number[] = [];
    for (let i = 0; i < n; i += 1) arr.push(Math.floor(Math.random() * 20));
    const t = segmentTreeBeats(arr);
    for (let i = 0; i < 200; i += 1) {
      const op = Math.floor(Math.random() * 3);
      const l = Math.floor(Math.random() * n);
      const r = l + Math.floor(Math.random() * (n - l));
      if (op === 0) {
        const v = Math.floor(Math.random() * 7) - 3;
        t.rangeAdd(l, r, v);
        for (let j = l; j <= r; j += 1) arr[j] += v;
      } else if (op === 1) {
        const v = Math.floor(Math.random() * 20);
        t.rangeChmin(l, r, v);
        for (let j = l; j <= r; j += 1) arr[j] = Math.min(arr[j], v);
      } else {
        let s = 0;
        for (let j = l; j <= r; j += 1) s += arr[j];
        expect(t.rangeSum(l, r)).toBe(s);
      }
    }
  });
});
