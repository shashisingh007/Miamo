import { describe, it, expect } from 'vitest';
import { hellingerDistance } from '../hellingerDistance';

describe('hellingerDistance', () => {
  it('zero for identical', () => {
    expect(hellingerDistance([0.5, 0.5], [0.5, 0.5])).toBeCloseTo(0, 12);
  });

  it('symmetric', () => {
    const a = hellingerDistance([0.7, 0.3], [0.2, 0.8]);
    const b = hellingerDistance([0.2, 0.8], [0.7, 0.3]);
    expect(a).toBeCloseTo(b, 12);
  });

  it('disjoint supports = 1', () => {
    expect(hellingerDistance([1, 0], [0, 1])).toBeCloseTo(1, 12);
  });

  it('bounded in [0, 1]', () => {
    const v = hellingerDistance([0.7, 0.3], [0.5, 0.5]);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  });

  it('non-negative', () => {
    expect(hellingerDistance([0.6, 0.4], [0.3, 0.7])).toBeGreaterThan(0);
  });

  it('throws on length mismatch', () => {
    expect(() => hellingerDistance([0.5, 0.5], [1])).toThrow();
  });

  it('throws on empty', () => {
    expect(() => hellingerDistance([], [])).toThrow();
  });

  it('throws on negative', () => {
    expect(() => hellingerDistance([-0.1, 1.1], [0.5, 0.5])).toThrow();
  });

  it('throws on non-finite', () => {
    expect(() => hellingerDistance([NaN, 1], [0.5, 0.5])).toThrow();
  });

  it('throws on zero mass', () => {
    expect(() => hellingerDistance([0, 0], [0.5, 0.5])).toThrow();
  });

  it('normalizes inputs', () => {
    const a = hellingerDistance([7, 3], [5, 5]);
    const b = hellingerDistance([0.7, 0.3], [0.5, 0.5]);
    expect(a).toBeCloseTo(b, 12);
  });

  it('handles zeros in one distribution', () => {
    const v = hellingerDistance([0, 1], [0.5, 0.5]);
    expect(Number.isFinite(v)).toBe(true);
    expect(v).toBeGreaterThan(0);
  });

  it('triangle inequality (basic)', () => {
    const a = hellingerDistance([1, 0], [0.5, 0.5]);
    const b = hellingerDistance([0.5, 0.5], [0, 1]);
    const c = hellingerDistance([1, 0], [0, 1]);
    expect(a + b).toBeGreaterThanOrEqual(c - 1e-12);
  });

  it('larger distribution', () => {
    const v = hellingerDistance([0.1, 0.2, 0.3, 0.4], [0.25, 0.25, 0.25, 0.25]);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(1);
  });
});
