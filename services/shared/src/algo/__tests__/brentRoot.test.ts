import { describe, it, expect } from 'vitest';
import { brentRoot } from '../brentRoot';

describe('brentRoot', () => {
  it('finds root of x^2 - 2 in [1, 2]', () => {
    const r = brentRoot((x) => x * x - 2, 1, 2);
    expect(r.converged).toBe(true);
    expect(r.root).toBeCloseTo(Math.SQRT2, 10);
  });

  it('finds root of cos(x) - x in [0, 1]', () => {
    const r = brentRoot((x) => Math.cos(x) - x, 0, 1);
    expect(r.converged).toBe(true);
    expect(Math.abs(Math.cos(r.root) - r.root)).toBeLessThan(1e-10);
  });

  it('returns endpoint when f(a) is exactly zero', () => {
    const r = brentRoot((x) => x, 0, 1);
    expect(r.root).toBe(0);
    expect(r.iterations).toBe(0);
  });

  it('returns endpoint when f(b) is exactly zero', () => {
    const r = brentRoot((x) => x, -1, 0);
    expect(r.root).toBe(0);
  });

  it('rejects same-sign bracket', () => {
    expect(() => brentRoot((x) => x * x + 1, -1, 1)).toThrow();
  });

  it('rejects non-finite bracket', () => {
    expect(() => brentRoot((x) => x, -Infinity, 1)).toThrow();
  });

  it('finds root of cubic x^3 - x - 2 in [1, 2]', () => {
    const r = brentRoot((x) => x * x * x - x - 2, 1, 2);
    expect(r.converged).toBe(true);
    const v = r.root ** 3 - r.root - 2;
    expect(Math.abs(v)).toBeLessThan(1e-10);
  });

  it('respects tighter tolerance', () => {
    const r = brentRoot((x) => x * x - 2, 1, 2, { tol: 1e-15 });
    expect(Math.abs(r.root - Math.SQRT2)).toBeLessThan(1e-12);
  });

  it('reports non-convergence with tiny maxIter', () => {
    const r = brentRoot((x) => x - 1e-20, -1, 1, { maxIter: 0, tol: 0 });
    expect(r.iterations).toBeLessThanOrEqual(0);
  });

  it('finds root of negative bracket [-3, 0] for f=x+2', () => {
    const r = brentRoot((x) => x + 2, -3, 0);
    expect(r.converged).toBe(true);
    expect(r.root).toBeCloseTo(-2, 10);
  });

  it('handles linear in [0, 4]', () => {
    const r = brentRoot((x) => 2 * x - 5, 0, 4);
    expect(r.converged).toBe(true);
    expect(r.root).toBeCloseTo(2.5, 10);
  });
});
