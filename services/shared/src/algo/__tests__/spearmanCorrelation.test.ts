import { describe, it, expect } from 'vitest';
import { spearmanCorrelation } from '../spearmanCorrelation';

describe('spearmanCorrelation', () => {
  it('perfect monotone => 1', () => {
    expect(spearmanCorrelation([1, 2, 3], [10, 20, 30])).toBeCloseTo(1, 12);
  });

  it('perfect reverse => -1', () => {
    expect(spearmanCorrelation([1, 2, 3], [30, 20, 10])).toBeCloseTo(-1, 12);
  });

  it('rank-invariant under nonlinear monotone', () => {
    expect(spearmanCorrelation([1, 2, 3, 4], [1, 8, 27, 64])).toBeCloseTo(1, 12);
  });

  it('symmetric', () => {
    const a = spearmanCorrelation([1, 3, 2], [4, 6, 5]);
    const b = spearmanCorrelation([4, 6, 5], [1, 3, 2]);
    expect(a).toBeCloseTo(b, 12);
  });

  it('throws on length mismatch', () => {
    expect(() => spearmanCorrelation([1, 2], [1])).toThrow();
  });

  it('throws on empty', () => {
    expect(() => spearmanCorrelation([], [])).toThrow();
  });

  it('throws on single point', () => {
    expect(() => spearmanCorrelation([1], [1])).toThrow();
  });

  it('throws on non-finite', () => {
    expect(() => spearmanCorrelation([NaN, 1], [1, 2])).toThrow();
  });

  it('handles ties via average rank', () => {
    const v = spearmanCorrelation([1, 1, 2, 3], [1, 1, 2, 3]);
    expect(v).toBeCloseTo(1, 6);
  });

  it('bounded in [-1, 1]', () => {
    const v = spearmanCorrelation([1, 3, 2, 4, 5], [2, 1, 4, 3, 5]);
    expect(v).toBeGreaterThanOrEqual(-1);
    expect(v).toBeLessThanOrEqual(1);
  });

  it('throws on zero variance', () => {
    expect(() => spearmanCorrelation([1, 1, 1], [1, 2, 3])).toThrow();
  });

  it('larger sample', () => {
    const x = [];
    const y = [];
    for (let i = 0; i < 100; i++) {
      x.push(i);
      y.push(Math.exp(i / 10));
    }
    expect(spearmanCorrelation(x, y)).toBeCloseTo(1, 12);
  });

  it('handles negatives', () => {
    expect(spearmanCorrelation([-3, -2, -1, 0, 1], [-6, -4, -2, 0, 2])).toBeCloseTo(1, 12);
  });

  it('weak correlation', () => {
    const v = spearmanCorrelation([1, 2, 3, 4], [3, 1, 4, 2]);
    expect(Math.abs(v)).toBeLessThan(1);
  });

  it('shifted sequences => 1', () => {
    expect(spearmanCorrelation([1, 2, 3, 4], [10, 11, 12, 13])).toBeCloseTo(1, 12);
  });
});
