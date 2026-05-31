import { describe, it, expect } from 'vitest';
import { chiSquaredDistance } from '../chiSquaredDistance';

describe('chiSquaredDistance', () => {
  it('zero for identical', () => {
    expect(chiSquaredDistance([0.5, 0.5], [0.5, 0.5])).toBeCloseTo(0, 12);
  });

  it('symmetric', () => {
    const a = chiSquaredDistance([0.7, 0.3], [0.2, 0.8]);
    const b = chiSquaredDistance([0.2, 0.8], [0.7, 0.3]);
    expect(a).toBeCloseTo(b, 12);
  });

  it('non-negative', () => {
    expect(chiSquaredDistance([0.6, 0.4], [0.3, 0.7])).toBeGreaterThan(0);
  });

  it('disjoint => 1', () => {
    expect(chiSquaredDistance([1, 0], [0, 1])).toBeCloseTo(1, 12);
  });

  it('throws on length mismatch', () => {
    expect(() => chiSquaredDistance([0.5, 0.5], [1])).toThrow();
  });

  it('throws on empty', () => {
    expect(() => chiSquaredDistance([], [])).toThrow();
  });

  it('throws on negative', () => {
    expect(() => chiSquaredDistance([-0.1, 1.1], [0.5, 0.5])).toThrow();
  });

  it('throws on non-finite', () => {
    expect(() => chiSquaredDistance([NaN, 1], [0.5, 0.5])).toThrow();
  });

  it('throws on zero mass', () => {
    expect(() => chiSquaredDistance([0, 0], [0.5, 0.5])).toThrow();
  });

  it('normalizes inputs', () => {
    const a = chiSquaredDistance([7, 3], [5, 5]);
    const b = chiSquaredDistance([0.7, 0.3], [0.5, 0.5]);
    expect(a).toBeCloseTo(b, 12);
  });

  it('uniform vs uniform = 0', () => {
    expect(chiSquaredDistance([1, 1, 1, 1], [1, 1, 1, 1])).toBeCloseTo(0, 12);
  });

  it('zero in both bins skipped', () => {
    const v = chiSquaredDistance([0, 0.5, 0.5], [0, 0.5, 0.5]);
    expect(v).toBeCloseTo(0, 12);
  });

  it('larger distribution', () => {
    const v = chiSquaredDistance([0.1, 0.2, 0.3, 0.4], [0.25, 0.25, 0.25, 0.25]);
    expect(v).toBeGreaterThan(0);
  });

  it('bounded by 1', () => {
    const v = chiSquaredDistance([0.7, 0.3], [0.5, 0.5]);
    expect(v).toBeLessThanOrEqual(1);
  });
});
