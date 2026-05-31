import { describe, it, expect } from 'vitest';
import { quickSelectKth } from '../quickSelectKth';

describe('quickSelectKth', () => {
  it('throws on empty', () => {
    expect(() => quickSelectKth([], 0)).toThrow(RangeError);
  });

  it('throws on k < 0', () => {
    expect(() => quickSelectKth([1], -1)).toThrow(RangeError);
  });

  it('throws on k >= length', () => {
    expect(() => quickSelectKth([1, 2], 2)).toThrow(RangeError);
  });

  it('throws on non-integer k', () => {
    expect(() => quickSelectKth([1, 2], 0.5)).toThrow(RangeError);
  });

  it('k=0 returns min', () => {
    expect(quickSelectKth([3, 1, 2], 0)).toBe(1);
  });

  it('k=last returns max', () => {
    expect(quickSelectKth([3, 1, 2], 2)).toBe(3);
  });

  it('k=mid returns median', () => {
    expect(quickSelectKth([3, 1, 2, 5, 4], 2)).toBe(3);
  });

  it('handles duplicates', () => {
    expect(quickSelectKth([2, 2, 2, 2], 1)).toBe(2);
  });

  it('matches sorted for random-ish input', () => {
    const a = [9, 3, 7, 1, 8, 2, 5, 6, 4, 0];
    const sorted = [...a].sort((x, y) => x - y);
    for (let k = 0; k < a.length; k += 1) {
      expect(quickSelectKth(a, k)).toBe(sorted[k]);
    }
  });

  it('does not mutate input', () => {
    const a = [3, 1, 2];
    const copy = [...a];
    quickSelectKth(a, 1);
    expect(a).toEqual(copy);
  });

  it('custom comparator (descending)', () => {
    expect(quickSelectKth([1, 2, 3, 4, 5], 0, (a, b) => b - a)).toBe(5);
  });

  it('strings lexicographic', () => {
    expect(quickSelectKth(['banana', 'apple', 'cherry'], 1)).toBe('banana');
  });

  it('single element', () => {
    expect(quickSelectKth([42], 0)).toBe(42);
  });

  it('large array median', () => {
    const a = Array.from({ length: 101 }, (_, i) => 100 - i);
    expect(quickSelectKth(a, 50)).toBe(50);
  });
});
