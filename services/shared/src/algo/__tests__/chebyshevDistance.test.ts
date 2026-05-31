import { describe, it, expect } from 'vitest';
import { chebyshevDistance } from '../chebyshevDistance';

describe('chebyshevDistance', () => {
  it('zero for identical', () => {
    expect(chebyshevDistance([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  it('max abs diff', () => {
    expect(chebyshevDistance([0, 0, 0], [3, 4, 5])).toBe(5);
  });

  it('1D', () => {
    expect(chebyshevDistance([5], [2])).toBe(3);
  });

  it('symmetric', () => {
    expect(chebyshevDistance([1, 2, 3], [4, 5, 6])).toBe(
      chebyshevDistance([4, 5, 6], [1, 2, 3])
    );
  });

  it('handles negatives', () => {
    expect(chebyshevDistance([-1, -10], [1, 0])).toBe(10);
  });

  it('non-negative', () => {
    expect(chebyshevDistance([1, 2], [3, 5])).toBeGreaterThanOrEqual(0);
  });

  it('bounded by manhattan', () => {
    expect(chebyshevDistance([1, 2], [3, 4])).toBeLessThanOrEqual(2 + 2);
  });

  it('bounded by euclidean', () => {
    expect(chebyshevDistance([1, 2], [3, 4])).toBeLessThanOrEqual(Math.sqrt(4 + 4));
  });

  it('throws on length mismatch', () => {
    expect(() => chebyshevDistance([1, 2], [1])).toThrow();
  });

  it('throws on empty', () => {
    expect(() => chebyshevDistance([], [])).toThrow();
  });

  it('throws on NaN', () => {
    expect(() => chebyshevDistance([NaN], [0])).toThrow();
  });

  it('throws on Infinity', () => {
    expect(() => chebyshevDistance([Infinity], [0])).toThrow();
  });

  it('handles high dim', () => {
    const a = Array.from({ length: 100 }, (_, i) => i);
    const b = Array.from({ length: 100 }, () => 0);
    expect(chebyshevDistance(a, b)).toBe(99);
  });
});
