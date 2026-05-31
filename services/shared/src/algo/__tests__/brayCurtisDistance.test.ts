import { describe, it, expect } from 'vitest';
import { brayCurtisDistance } from '../brayCurtisDistance';

describe('brayCurtisDistance', () => {
  it('zero for identical', () => {
    expect(brayCurtisDistance([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  it('1 for fully disjoint distributions', () => {
    expect(brayCurtisDistance([1, 0], [0, 1])).toBeCloseTo(1, 12);
  });

  it('half overlap', () => {
    expect(brayCurtisDistance([1, 1], [1, 0])).toBeCloseTo(1 / 3, 12);
  });

  it('symmetric', () => {
    expect(brayCurtisDistance([1, 2, 3], [4, 5, 6])).toBeCloseTo(
      brayCurtisDistance([4, 5, 6], [1, 2, 3]),
      12
    );
  });

  it('bounded in [0, 1]', () => {
    const v = brayCurtisDistance([1, 2, 3], [4, 5, 6]);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  });

  it('throws on length mismatch', () => {
    expect(() => brayCurtisDistance([1, 2], [1])).toThrow();
  });

  it('throws on empty', () => {
    expect(() => brayCurtisDistance([], [])).toThrow();
  });

  it('throws on negatives', () => {
    expect(() => brayCurtisDistance([-1], [1])).toThrow();
  });

  it('throws on NaN', () => {
    expect(() => brayCurtisDistance([NaN], [1])).toThrow();
  });

  it('throws on Infinity', () => {
    expect(() => brayCurtisDistance([Infinity], [1])).toThrow();
  });

  it('throws on all-zero pairs', () => {
    expect(() => brayCurtisDistance([0, 0], [0, 0])).toThrow();
  });

  it('handles partial zeros', () => {
    expect(brayCurtisDistance([0, 1], [1, 1])).toBeCloseTo(1 / 3, 12);
  });

  it('handles high dim', () => {
    const a = Array.from({ length: 50 }, () => 1);
    const b = Array.from({ length: 50 }, () => 3);
    expect(brayCurtisDistance(a, b)).toBeCloseTo(50 * 2 / (50 * 4), 12);
  });
});
