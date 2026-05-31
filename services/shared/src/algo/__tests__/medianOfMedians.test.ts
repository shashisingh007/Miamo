import { describe, it, expect } from 'vitest';
import { medianOfMedians } from '../medianOfMedians';

describe('medianOfMedians', () => {
  it('throws on non-array', () => {
    expect(() => medianOfMedians(null as any, 0)).toThrow();
  });

  it('throws on empty', () => {
    expect(() => medianOfMedians([], 0)).toThrow();
  });

  it('throws on bad k', () => {
    expect(() => medianOfMedians([1, 2, 3], -1)).toThrow();
    expect(() => medianOfMedians([1, 2, 3], 3)).toThrow();
    expect(() => medianOfMedians([1, 2, 3], 1.5)).toThrow();
  });

  it('throws on non-finite', () => {
    expect(() => medianOfMedians([1, NaN], 0)).toThrow();
  });

  it('k=0 => min', () => {
    expect(medianOfMedians([3, 1, 4, 1, 5, 9, 2, 6], 0)).toBe(1);
  });

  it('k=n-1 => max', () => {
    expect(medianOfMedians([3, 1, 4, 1, 5, 9, 2, 6], 7)).toBe(9);
  });

  it('median of [1..7] => 4', () => {
    expect(medianOfMedians([1, 2, 3, 4, 5, 6, 7], 3)).toBe(4);
  });

  it('matches sorted index', () => {
    const v = [5, 2, 8, 1, 9, 3, 7, 4, 6, 10];
    const sorted = v.slice().sort((a, b) => a - b);
    for (let k = 0; k < v.length; k++) {
      expect(medianOfMedians(v, k)).toBe(sorted[k]);
    }
  });

  it('handles duplicates', () => {
    expect(medianOfMedians([5, 5, 5, 5, 5], 2)).toBe(5);
  });

  it('single value', () => {
    expect(medianOfMedians([42], 0)).toBe(42);
  });

  it('does not mutate input', () => {
    const v = [3, 1, 4, 1, 5, 9, 2, 6];
    const ref = v.slice();
    medianOfMedians(v, 4);
    expect(v).toEqual(ref);
  });

  it('large array stress', () => {
    const v: number[] = [];
    for (let i = 0; i < 200; i++) v.push(((i * 37) % 200));
    const sorted = v.slice().sort((a, b) => a - b);
    expect(medianOfMedians(v, 100)).toBe(sorted[100]);
    expect(medianOfMedians(v, 50)).toBe(sorted[50]);
    expect(medianOfMedians(v, 199)).toBe(sorted[199]);
  });

  it('negatives and floats', () => {
    const v = [-3.5, 2.1, 0, -1.2, 4.4];
    const sorted = v.slice().sort((a, b) => a - b);
    expect(medianOfMedians(v, 2)).toBe(sorted[2]);
  });
});
