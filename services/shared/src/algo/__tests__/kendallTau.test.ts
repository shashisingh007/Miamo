import { describe, it, expect } from 'vitest';
import { kendallTau } from '../kendallTau';

describe('kendallTau', () => {
  it('perfect concordant => 1', () => {
    expect(kendallTau([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1, 12);
  });

  it('perfect discordant => -1', () => {
    expect(kendallTau([1, 2, 3, 4], [40, 30, 20, 10])).toBeCloseTo(-1, 12);
  });

  it('symmetric', () => {
    const a = kendallTau([1, 3, 2], [4, 6, 5]);
    const b = kendallTau([4, 6, 5], [1, 3, 2]);
    expect(a).toBeCloseTo(b, 12);
  });

  it('throws on length mismatch', () => {
    expect(() => kendallTau([1, 2], [1])).toThrow();
  });

  it('throws on empty', () => {
    expect(() => kendallTau([], [])).toThrow();
  });

  it('throws on single point', () => {
    expect(() => kendallTau([1], [1])).toThrow();
  });

  it('throws on non-finite', () => {
    expect(() => kendallTau([NaN, 1], [1, 2])).toThrow();
  });

  it('throws on all-tied input', () => {
    expect(() => kendallTau([1, 1, 1], [1, 2, 3])).toThrow();
  });

  it('handles ties (tau-b)', () => {
    const v = kendallTau([1, 1, 2, 3], [1, 2, 3, 4]);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThanOrEqual(1);
  });

  it('bounded in [-1, 1]', () => {
    const v = kendallTau([1, 3, 2, 4, 5], [2, 1, 4, 3, 5]);
    expect(v).toBeGreaterThanOrEqual(-1);
    expect(v).toBeLessThanOrEqual(1);
  });

  it('rank-invariant under monotone', () => {
    const a = kendallTau([1, 2, 3, 4], [1, 4, 9, 16]);
    expect(a).toBeCloseTo(1, 12);
  });

  it('larger sample', () => {
    const x = [];
    const y = [];
    for (let i = 0; i < 50; i++) {
      x.push(i);
      y.push(2 * i);
    }
    expect(kendallTau(x, y)).toBeCloseTo(1, 12);
  });

  it('handles negatives', () => {
    expect(kendallTau([-3, -2, -1, 0, 1], [-6, -4, -2, 0, 2])).toBeCloseTo(1, 12);
  });

  it('weak correlation', () => {
    const v = kendallTau([1, 2, 3, 4], [3, 1, 4, 2]);
    expect(Math.abs(v)).toBeLessThan(1);
  });
});
