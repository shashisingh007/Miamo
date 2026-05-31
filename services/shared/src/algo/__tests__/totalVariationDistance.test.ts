import { describe, it, expect } from 'vitest';
import { totalVariationDistance } from '../totalVariationDistance';

describe('totalVariationDistance', () => {
  it('zero for identical', () => {
    expect(totalVariationDistance([0.5, 0.5], [0.5, 0.5])).toBeCloseTo(0, 12);
  });

  it('one for disjoint', () => {
    expect(totalVariationDistance([1, 0], [0, 1])).toBeCloseTo(1, 12);
  });

  it('symmetric', () => {
    const a = totalVariationDistance([0.7, 0.3], [0.2, 0.8]);
    const b = totalVariationDistance([0.2, 0.8], [0.7, 0.3]);
    expect(a).toBeCloseTo(b, 12);
  });

  it('bounded in [0, 1]', () => {
    const v = totalVariationDistance([0.7, 0.3], [0.5, 0.5]);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  });

  it('non-negative', () => {
    expect(totalVariationDistance([0.6, 0.4], [0.3, 0.7])).toBeGreaterThan(0);
  });

  it('throws on length mismatch', () => {
    expect(() => totalVariationDistance([0.5, 0.5], [1])).toThrow();
  });

  it('throws on empty', () => {
    expect(() => totalVariationDistance([], [])).toThrow();
  });

  it('throws on negative', () => {
    expect(() => totalVariationDistance([-0.1, 1.1], [0.5, 0.5])).toThrow();
  });

  it('throws on non-finite', () => {
    expect(() => totalVariationDistance([NaN, 1], [0.5, 0.5])).toThrow();
  });

  it('throws on zero mass', () => {
    expect(() => totalVariationDistance([0, 0], [0.5, 0.5])).toThrow();
  });

  it('normalizes inputs', () => {
    const a = totalVariationDistance([7, 3], [5, 5]);
    const b = totalVariationDistance([0.7, 0.3], [0.5, 0.5]);
    expect(a).toBeCloseTo(b, 12);
  });

  it('known value: TV([0.7,0.3],[0.5,0.5]) = 0.2', () => {
    expect(totalVariationDistance([0.7, 0.3], [0.5, 0.5])).toBeCloseTo(0.2, 12);
  });

  it('triangle inequality', () => {
    const a = totalVariationDistance([1, 0], [0.5, 0.5]);
    const b = totalVariationDistance([0.5, 0.5], [0, 1]);
    const c = totalVariationDistance([1, 0], [0, 1]);
    expect(a + b).toBeGreaterThanOrEqual(c - 1e-12);
  });

  it('larger distribution', () => {
    const v = totalVariationDistance([0.1, 0.2, 0.3, 0.4], [0.25, 0.25, 0.25, 0.25]);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(1);
  });

  it('uniform vs uniform = 0', () => {
    expect(totalVariationDistance([1, 1, 1, 1], [1, 1, 1, 1])).toBeCloseTo(0, 12);
  });
});
