import { describe, it, expect } from 'vitest';
import { mahalanobisDistance } from '../mahalanobisDistance';

describe('mahalanobisDistance', () => {
  it('zero at mean', () => {
    expect(mahalanobisDistance([1, 2], [1, 2], [[1, 0], [0, 1]])).toBe(0);
  });

  it('identity invCov => Euclidean', () => {
    const v = mahalanobisDistance([3, 4], [0, 0], [[1, 0], [0, 1]]);
    expect(v).toBeCloseTo(5, 12);
  });

  it('scaling reduces with larger variance (smaller invCov)', () => {
    const a = mahalanobisDistance([2, 0], [0, 0], [[1, 0], [0, 1]]);
    const b = mahalanobisDistance([2, 0], [0, 0], [[0.25, 0], [0, 0.25]]);
    expect(b).toBeLessThan(a);
  });

  it('throws on empty', () => {
    expect(() => mahalanobisDistance([], [], [])).toThrow();
  });

  it('throws on dimension mismatch in mean', () => {
    expect(() => mahalanobisDistance([1, 2], [1], [[1, 0], [0, 1]])).toThrow();
  });

  it('throws on non-square invCov', () => {
    expect(() => mahalanobisDistance([1, 2], [0, 0], [[1, 0]] as any)).toThrow();
  });

  it('throws on invCov dim mismatch', () => {
    expect(() => mahalanobisDistance([1, 2], [0, 0], [[1]])).toThrow();
  });

  it('throws on non-finite x', () => {
    expect(() => mahalanobisDistance([NaN, 0], [0, 0], [[1, 0], [0, 1]])).toThrow();
  });

  it('throws on non-finite mean', () => {
    expect(() => mahalanobisDistance([0, 0], [NaN, 0], [[1, 0], [0, 1]])).toThrow();
  });

  it('throws on non-finite invCov', () => {
    expect(() => mahalanobisDistance([0, 0], [0, 0], [[NaN, 0], [0, 1]])).toThrow();
  });

  it('detects non-PSD via negative quadratic', () => {
    expect(() =>
      mahalanobisDistance([1, 0], [0, 0], [[-1, 0], [0, -1]])
    ).toThrow();
  });

  it('1D case', () => {
    expect(mahalanobisDistance([5], [2], [[1]])).toBeCloseTo(3, 12);
  });

  it('off-diagonal correlation', () => {
    const v = mahalanobisDistance([1, 1], [0, 0], [[2, 1], [1, 2]]);
    expect(v).toBeCloseTo(Math.sqrt(2 + 2 * 1 + 2), 12);
  });

  it('symmetry under sign flip', () => {
    const a = mahalanobisDistance([3, 4], [0, 0], [[1, 0], [0, 1]]);
    const b = mahalanobisDistance([-3, -4], [0, 0], [[1, 0], [0, 1]]);
    expect(a).toBeCloseTo(b, 12);
  });
});
