import { describe, it, expect } from 'vitest';
import { geometricMedian } from '../geometricMedian';

describe('geometricMedian', () => {
  it('throws on non-array', () => {
    expect(() => geometricMedian(null as any)).toThrow();
  });

  it('throws on empty', () => {
    expect(() => geometricMedian([])).toThrow();
  });

  it('throws on zero-dim', () => {
    expect(() => geometricMedian([[]])).toThrow();
  });

  it('throws on ragged', () => {
    expect(() => geometricMedian([[1, 2], [3]])).toThrow();
  });

  it('throws on non-finite', () => {
    expect(() => geometricMedian([[1, NaN]])).toThrow();
  });

  it('throws on bad maxIter', () => {
    expect(() => geometricMedian([[1, 2]], { maxIter: 0 })).toThrow();
  });

  it('throws on bad tol', () => {
    expect(() => geometricMedian([[1, 2]], { tol: -1 })).toThrow();
  });

  it('single point returns itself', () => {
    expect(geometricMedian([[3, 4]])).toEqual([3, 4]);
  });

  it('two collinear points: midpoint range', () => {
    const m = geometricMedian([[0, 0], [10, 0]]);
    expect(m[0]).toBeCloseTo(5, 3);
    expect(m[1]).toBeCloseTo(0, 3);
  });

  it('symmetric square: center', () => {
    const m = geometricMedian([
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]);
    expect(m[0]).toBeCloseTo(0.5, 3);
    expect(m[1]).toBeCloseTo(0.5, 3);
  });

  it('robust to outlier (vs centroid)', () => {
    const pts = [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
      [100, 100],
    ];
    const m = geometricMedian(pts);
    expect(m[0]).toBeLessThan(5);
    expect(m[1]).toBeLessThan(5);
  });

  it('1D works', () => {
    const m = geometricMedian([[1], [2], [3], [4], [100]]);
    expect(m[0]).toBeCloseTo(3, 1);
  });

  it('high-dim point', () => {
    const m = geometricMedian([[1, 2, 3, 4, 5]]);
    expect(m).toEqual([1, 2, 3, 4, 5]);
  });

  it('does not mutate input', () => {
    const pts = [[1, 2], [3, 4]];
    const ref = JSON.parse(JSON.stringify(pts));
    geometricMedian(pts);
    expect(pts).toEqual(ref);
  });
});
