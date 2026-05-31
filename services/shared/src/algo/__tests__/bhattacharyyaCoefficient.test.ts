import { describe, it, expect } from 'vitest';
import {
  bhattacharyyaCoefficient,
  bhattacharyyaDistance,
} from '../bhattacharyyaCoefficient';

describe('bhattacharyyaCoefficient', () => {
  it('1 for identical', () => {
    expect(bhattacharyyaCoefficient([0.5, 0.5], [0.5, 0.5])).toBeCloseTo(1, 12);
  });

  it('symmetric', () => {
    const a = bhattacharyyaCoefficient([0.7, 0.3], [0.2, 0.8]);
    const b = bhattacharyyaCoefficient([0.2, 0.8], [0.7, 0.3]);
    expect(a).toBeCloseTo(b, 12);
  });

  it('disjoint => 0', () => {
    expect(bhattacharyyaCoefficient([1, 0], [0, 1])).toBeCloseTo(0, 12);
  });

  it('bounded in [0, 1]', () => {
    const v = bhattacharyyaCoefficient([0.7, 0.3], [0.5, 0.5]);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  });

  it('throws on length mismatch', () => {
    expect(() => bhattacharyyaCoefficient([0.5, 0.5], [1])).toThrow();
  });

  it('throws on empty', () => {
    expect(() => bhattacharyyaCoefficient([], [])).toThrow();
  });

  it('throws on negative', () => {
    expect(() => bhattacharyyaCoefficient([-0.1, 1.1], [0.5, 0.5])).toThrow();
  });

  it('throws on non-finite', () => {
    expect(() => bhattacharyyaCoefficient([NaN, 1], [0.5, 0.5])).toThrow();
  });

  it('throws on zero mass', () => {
    expect(() => bhattacharyyaCoefficient([0, 0], [0.5, 0.5])).toThrow();
  });

  it('normalizes inputs', () => {
    const a = bhattacharyyaCoefficient([7, 3], [5, 5]);
    const b = bhattacharyyaCoefficient([0.7, 0.3], [0.5, 0.5]);
    expect(a).toBeCloseTo(b, 12);
  });

  it('distance is 0 for identical', () => {
    expect(bhattacharyyaDistance([0.5, 0.5], [0.5, 0.5])).toBeCloseTo(0, 12);
  });

  it('distance is +Infinity for disjoint', () => {
    expect(bhattacharyyaDistance([1, 0], [0, 1])).toBe(Infinity);
  });

  it('distance is positive for differing', () => {
    expect(bhattacharyyaDistance([0.7, 0.3], [0.5, 0.5])).toBeGreaterThan(0);
  });

  it('larger distribution', () => {
    const v = bhattacharyyaCoefficient([0.1, 0.2, 0.3, 0.4], [0.25, 0.25, 0.25, 0.25]);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(1);
  });
});
