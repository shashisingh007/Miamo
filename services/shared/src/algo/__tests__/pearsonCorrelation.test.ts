import { describe, it, expect } from 'vitest';
import { pearsonCorrelation } from '../pearsonCorrelation';

describe('pearsonCorrelation', () => {
  it('perfect positive => 1', () => {
    expect(pearsonCorrelation([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 12);
  });

  it('perfect negative => -1', () => {
    expect(pearsonCorrelation([1, 2, 3], [6, 4, 2])).toBeCloseTo(-1, 12);
  });

  it('uncorrelated near 0', () => {
    const v = pearsonCorrelation([1, 2, 3, 4], [4, 1, 4, 1]);
    expect(Math.abs(v)).toBeLessThan(1);
  });

  it('symmetric', () => {
    const a = pearsonCorrelation([1, 2, 3], [4, 5, 7]);
    const b = pearsonCorrelation([4, 5, 7], [1, 2, 3]);
    expect(a).toBeCloseTo(b, 12);
  });

  it('throws on length mismatch', () => {
    expect(() => pearsonCorrelation([1, 2], [1])).toThrow();
  });

  it('throws on empty', () => {
    expect(() => pearsonCorrelation([], [])).toThrow();
  });

  it('throws on single point', () => {
    expect(() => pearsonCorrelation([1], [1])).toThrow();
  });

  it('throws on non-finite', () => {
    expect(() => pearsonCorrelation([NaN, 1], [1, 2])).toThrow();
  });

  it('throws on zero variance', () => {
    expect(() => pearsonCorrelation([1, 1, 1], [1, 2, 3])).toThrow();
  });

  it('shift invariant', () => {
    const a = pearsonCorrelation([1, 2, 3], [4, 5, 6]);
    const b = pearsonCorrelation([11, 12, 13], [104, 105, 106]);
    expect(a).toBeCloseTo(b, 12);
  });

  it('positive scale invariant', () => {
    const a = pearsonCorrelation([1, 2, 3], [2, 4, 6]);
    const b = pearsonCorrelation([10, 20, 30], [200, 400, 600]);
    expect(a).toBeCloseTo(b, 12);
  });

  it('bounded in [-1, 1]', () => {
    const v = pearsonCorrelation([1, 3, 2, 4, 5], [2, 1, 4, 3, 5]);
    expect(v).toBeGreaterThanOrEqual(-1);
    expect(v).toBeLessThanOrEqual(1);
  });

  it('larger sample', () => {
    const x = [];
    const y = [];
    for (let i = 0; i < 100; i++) {
      x.push(i);
      y.push(2 * i + 1);
    }
    expect(pearsonCorrelation(x, y)).toBeCloseTo(1, 12);
  });

  it('handles negatives', () => {
    expect(pearsonCorrelation([-3, -2, -1, 0, 1], [-6, -4, -2, 0, 2])).toBeCloseTo(1, 12);
  });
});
