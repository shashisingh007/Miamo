import { describe, it, expect } from 'vitest';
import { canberraDistance } from '../canberraDistance';

describe('canberraDistance', () => {
  it('zero for identical', () => {
    expect(canberraDistance([1, 2, 3], [1, 2, 3])).toBeCloseTo(0, 12);
  });

  it('handles zero pair (skips)', () => {
    expect(canberraDistance([0, 1], [0, 2])).toBeCloseTo(1 / 3, 12);
  });

  it('1D pos', () => {
    expect(canberraDistance([3], [1])).toBeCloseTo(2 / 4, 12);
  });

  it('symmetric', () => {
    expect(canberraDistance([1, 2, 3], [4, 5, 6])).toBeCloseTo(
      canberraDistance([4, 5, 6], [1, 2, 3]),
      12
    );
  });

  it('handles negatives', () => {
    expect(canberraDistance([-1, 0], [1, 0])).toBeCloseTo(2 / 2, 12);
  });

  it('non-negative', () => {
    expect(canberraDistance([1, 2], [3, 4])).toBeGreaterThan(0);
  });

  it('each term in [0, 1]', () => {
    const v = canberraDistance([1, 2, 3], [4, 5, 6]);
    expect(v).toBeLessThanOrEqual(3);
  });

  it('opposite signs => 1 each', () => {
    expect(canberraDistance([1, 1], [-1, -1])).toBeCloseTo(2, 12);
  });

  it('throws on length mismatch', () => {
    expect(() => canberraDistance([1, 2], [1])).toThrow();
  });

  it('throws on empty', () => {
    expect(() => canberraDistance([], [])).toThrow();
  });

  it('throws on NaN', () => {
    expect(() => canberraDistance([NaN], [1])).toThrow();
  });

  it('throws on Infinity', () => {
    expect(() => canberraDistance([Infinity], [1])).toThrow();
  });

  it('all-zero pairs => 0', () => {
    expect(canberraDistance([0, 0, 0], [0, 0, 0])).toBe(0);
  });

  it('handles high dim', () => {
    const a = Array.from({ length: 50 }, () => 1);
    const b = Array.from({ length: 50 }, () => 3);
    expect(canberraDistance(a, b)).toBeCloseTo(50 * (2 / 4), 12);
  });
});
