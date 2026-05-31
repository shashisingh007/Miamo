import { describe, it, expect } from 'vitest';
import { euclideanDistance } from '../euclideanDistance';

describe('euclideanDistance', () => {
  it('zero for identical', () => {
    expect(euclideanDistance([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  it('3-4-5', () => {
    expect(euclideanDistance([0, 0], [3, 4])).toBeCloseTo(5, 12);
  });

  it('1D abs diff', () => {
    expect(euclideanDistance([5], [2])).toBeCloseTo(3, 12);
  });

  it('symmetric', () => {
    expect(euclideanDistance([1, 2, 3], [4, 5, 6])).toBeCloseTo(
      euclideanDistance([4, 5, 6], [1, 2, 3]),
      12
    );
  });

  it('non-negative', () => {
    expect(euclideanDistance([-1, -2], [3, 4])).toBeGreaterThan(0);
  });

  it('triangle inequality', () => {
    const a = [0, 0];
    const b = [1, 0];
    const c = [1, 1];
    expect(euclideanDistance(a, c)).toBeLessThanOrEqual(
      euclideanDistance(a, b) + euclideanDistance(b, c) + 1e-12
    );
  });

  it('throws on length mismatch', () => {
    expect(() => euclideanDistance([1, 2], [1])).toThrow();
  });

  it('throws on empty', () => {
    expect(() => euclideanDistance([], [])).toThrow();
  });

  it('throws on NaN', () => {
    expect(() => euclideanDistance([NaN], [0])).toThrow();
  });

  it('throws on Infinity', () => {
    expect(() => euclideanDistance([Infinity], [0])).toThrow();
  });

  it('handles negatives', () => {
    expect(euclideanDistance([-3, -4], [0, 0])).toBeCloseTo(5, 12);
  });

  it('handles high dim', () => {
    const a = Array.from({ length: 100 }, () => 0);
    const b = Array.from({ length: 100 }, () => 1);
    expect(euclideanDistance(a, b)).toBeCloseTo(10, 12);
  });
});
