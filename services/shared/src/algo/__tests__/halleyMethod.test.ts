import { describe, it, expect } from 'vitest';
import { halleyMethod } from '../halleyMethod';

describe('halleyMethod', () => {
  it('finds sqrt(2) as root of x^2 - 2', () => {
    const r = halleyMethod((x) => x * x - 2, (x) => 2 * x, () => 2, 1.5);
    expect(r.converged).toBe(true);
    expect(r.root).toBeCloseTo(Math.SQRT2, 12);
  });

  it('finds root of cubic', () => {
    const r = halleyMethod(
      (x) => x * x * x - x - 2,
      (x) => 3 * x * x - 1,
      (x) => 6 * x,
      1.5,
    );
    expect(r.converged).toBe(true);
    expect(r.root).toBeCloseTo(1.521379706804568, 9);
  });

  it('cubic convergence (few iterations)', () => {
    const r = halleyMethod((x) => x * x - 2, (x) => 2 * x, () => 2, 1.5);
    expect(r.iterations).toBeLessThanOrEqual(5);
  });

  it('finds negative root', () => {
    const r = halleyMethod((x) => x * x - 9, (x) => 2 * x, () => 2, -2);
    expect(r.root).toBeCloseTo(-3, 12);
  });

  it('detects already-at-root', () => {
    const r = halleyMethod((x) => x * x - 1, (x) => 2 * x, () => 2, 1);
    expect(r.converged).toBe(true);
    expect(r.root).toBeCloseTo(1, 14);
  });

  it('non-convergence flagged when maxIterations too small', () => {
    const r = halleyMethod(
      (x) => x * x - 2,
      (x) => 2 * x,
      () => 2,
      1.5,
      { maxIterations: 1, tolerance: 1e-15 },
    );
    expect(r.converged).toBe(false);
  });

  it('rejects non-finite x0', () => {
    expect(() => halleyMethod((x) => x, () => 1, () => 0, Infinity)).toThrow();
  });

  it('rejects non-positive tolerance', () => {
    expect(() => halleyMethod((x) => x, () => 1, () => 0, 1, { tolerance: 0 })).toThrow();
  });

  it('rejects bad maxIterations', () => {
    expect(() => halleyMethod((x) => x, () => 1, () => 0, 1, { maxIterations: 0 })).toThrow();
  });

  it('throws on vanishing denominator', () => {
    // f = x, f' = 1, f'' = 0 → denom = 2 ≠ 0, so use a constructed pathology
    expect(() =>
      halleyMethod(
        (x) => x,
        () => 0,
        () => 0,
        1,
      ),
    ).toThrow(/denominator/);
  });

  it('finds root of transcendental cos(x) - x', () => {
    const r = halleyMethod(
      (x) => Math.cos(x) - x,
      (x) => -Math.sin(x) - 1,
      (x) => -Math.cos(x),
      0.5,
    );
    expect(r.root).toBeCloseTo(0.7390851332151607, 10);
  });
});
