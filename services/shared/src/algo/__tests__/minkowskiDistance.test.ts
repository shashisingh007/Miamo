import { describe, it, expect } from 'vitest';
import { minkowskiDistance } from '../minkowskiDistance';

describe('minkowskiDistance', () => {
  it('p=1 => manhattan', () => {
    expect(minkowskiDistance([0, 0], [3, 4], 1)).toBeCloseTo(7, 12);
  });

  it('p=2 => euclidean', () => {
    expect(minkowskiDistance([0, 0], [3, 4], 2)).toBeCloseTo(5, 12);
  });

  it('p=3', () => {
    const v = minkowskiDistance([0, 0], [1, 1], 3);
    expect(v).toBeCloseTo(Math.cbrt(2), 12);
  });

  it('zero for identical', () => {
    expect(minkowskiDistance([1, 2, 3], [1, 2, 3], 2)).toBe(0);
  });

  it('symmetric', () => {
    expect(minkowskiDistance([1, 2], [3, 4], 2)).toBeCloseTo(
      minkowskiDistance([3, 4], [1, 2], 2),
      12
    );
  });

  it('decreases with p (for unit-vector sums)', () => {
    const a = minkowskiDistance([0, 0], [1, 1], 1);
    const b = minkowskiDistance([0, 0], [1, 1], 2);
    expect(b).toBeLessThan(a);
  });

  it('throws on length mismatch', () => {
    expect(() => minkowskiDistance([1], [1, 2], 2)).toThrow();
  });

  it('throws on empty', () => {
    expect(() => minkowskiDistance([], [], 2)).toThrow();
  });

  it('throws on p<1', () => {
    expect(() => minkowskiDistance([0], [1], 0.5)).toThrow();
  });

  it('throws on non-finite p', () => {
    expect(() => minkowskiDistance([0], [1], Infinity)).toThrow();
  });

  it('throws on NaN entries', () => {
    expect(() => minkowskiDistance([NaN], [0], 2)).toThrow();
  });

  it('handles negatives', () => {
    expect(minkowskiDistance([-3, -4], [0, 0], 2)).toBeCloseTo(5, 12);
  });

  it('p=1 nonneg', () => {
    expect(minkowskiDistance([1, -1], [-1, 1], 1)).toBeCloseTo(4, 12);
  });
});
