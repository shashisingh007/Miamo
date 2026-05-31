import { describe, it, expect } from 'vitest';
import { weightedMedian } from '../weightedMedian';

describe('weightedMedian', () => {
  it('throws on empty', () => {
    expect(() => weightedMedian([], [])).toThrow();
  });

  it('throws on length mismatch', () => {
    expect(() => weightedMedian([1, 2], [1])).toThrow();
  });

  it('throws on negative weight', () => {
    expect(() => weightedMedian([1, 2], [1, -1])).toThrow();
  });

  it('throws on all-zero weights', () => {
    expect(() => weightedMedian([1, 2, 3], [0, 0, 0])).toThrow();
  });

  it('throws on NaN weight', () => {
    expect(() => weightedMedian([1, 2], [NaN, 1])).toThrow();
  });

  it('single element returns it', () => {
    expect(weightedMedian([42], [3])).toBe(42);
  });

  it('uniform weights matches lower-median for odd', () => {
    expect(weightedMedian([3, 1, 5, 2, 4], [1, 1, 1, 1, 1])).toBe(3);
  });

  it('uniform weights for even returns lower-median', () => {
    // sorted [1,2,3,4], half=2, cumulative reaches 2 at index 1 (value 2)
    expect(weightedMedian([1, 2, 3, 4], [1, 1, 1, 1])).toBe(2);
  });

  it('weight skew shifts median', () => {
    // values 1..3, heavy weight on 3
    expect(weightedMedian([1, 2, 3], [1, 1, 10])).toBe(3);
  });

  it('symmetric weights', () => {
    expect(weightedMedian([1, 5, 9], [1, 2, 1])).toBe(5);
  });

  it('order independent', () => {
    const a = weightedMedian([3, 1, 5, 2, 4], [1, 2, 3, 4, 5]);
    const b = weightedMedian([1, 2, 3, 4, 5], [2, 4, 1, 5, 3]);
    expect(a).toBe(b);
  });

  it('zero-weight entries skipped effectively', () => {
    expect(weightedMedian([1, 2, 3], [0, 1, 0])).toBe(2);
  });

  it('large skew to first', () => {
    expect(weightedMedian([1, 2, 3], [10, 1, 1])).toBe(1);
  });

  it('handles duplicates', () => {
    expect(weightedMedian([2, 2, 2, 5], [1, 1, 1, 1])).toBe(2);
  });

  it('does not mutate inputs', () => {
    const v = [3, 1, 2];
    const w = [1, 1, 1];
    weightedMedian(v, w);
    expect(v).toEqual([3, 1, 2]);
    expect(w).toEqual([1, 1, 1]);
  });
});
