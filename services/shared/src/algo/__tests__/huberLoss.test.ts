import { describe, it, expect } from 'vitest';
import { huberLoss, huberGrad, huberLossElement, huberGradElement } from '../huberLoss';

describe('huberLoss', () => {
  it('throws on non-array', () => {
    expect(() => huberLoss(null as any)).toThrow();
  });

  it('throws on non-positive delta', () => {
    expect(() => huberLoss([1], 0)).toThrow();
    expect(() => huberLoss([1], -1)).toThrow();
  });

  it('throws on non-finite delta', () => {
    expect(() => huberLoss([1], NaN)).toThrow();
  });

  it('throws on non-finite residual', () => {
    expect(() => huberLoss([NaN], 1)).toThrow();
  });

  it('empty residual sum is zero', () => {
    expect(huberLoss([])).toBe(0);
  });

  it('quadratic regime when |r| <= delta', () => {
    expect(huberLoss([0.5, -0.5], 1)).toBeCloseTo(0.25, 12);
  });

  it('linear regime when |r| > delta', () => {
    // delta=1, r=2: linear = 1*(2-0.5) = 1.5
    expect(huberLoss([2], 1)).toBeCloseTo(1.5, 12);
  });

  it('continuity at boundary |r| = delta', () => {
    const a = huberLossElement(1.0, 1);
    const b = huberLossElement(1.0 + 1e-12, 1);
    expect(Math.abs(a - b)).toBeLessThan(1e-9);
  });

  it('symmetry L(r) = L(-r)', () => {
    expect(huberLoss([3], 1)).toBeCloseTo(huberLoss([-3], 1), 12);
  });

  it('large delta => behaves like 0.5 r^2', () => {
    const rs = [-2, -1, 0, 1, 2];
    const expected = rs.reduce((s, r) => s + 0.5 * r * r, 0);
    expect(huberLoss(rs, 1000)).toBeCloseTo(expected, 6);
  });

  it('default delta = 1', () => {
    expect(huberLoss([0.5])).toBeCloseTo(0.125, 12);
  });
});

describe('huberGrad', () => {
  it('quadratic regime: gradient = r', () => {
    expect(huberGrad([-0.3, 0, 0.7], 1)).toEqual([-0.3, 0, 0.7]);
  });

  it('linear regime: gradient = sign(r) * delta', () => {
    expect(huberGrad([5, -5], 1)).toEqual([1, -1]);
  });

  it('boundary at delta exact', () => {
    expect(huberGradElement(1, 1)).toBe(1);
    expect(huberGradElement(-1, 1)).toBe(-1);
  });

  it('throws on non-positive delta', () => {
    expect(() => huberGrad([1], 0)).toThrow();
  });

  it('preserves length', () => {
    expect(huberGrad([1, 2, 3, 4, 5], 1)).toHaveLength(5);
  });
});
