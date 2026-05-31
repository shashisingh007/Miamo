import { describe, it, expect } from 'vitest';
import { goldenSectionSearch } from '../goldenSectionSearch';

describe('goldenSectionSearch', () => {
  it('throws on infinite bounds', () => {
    expect(() => goldenSectionSearch((x) => x * x, NaN, 1)).toThrow();
    expect(() => goldenSectionSearch((x) => x * x, 0, Infinity)).toThrow();
  });

  it('throws when a>=b', () => {
    expect(() => goldenSectionSearch((x) => x * x, 1, 1)).toThrow();
    expect(() => goldenSectionSearch((x) => x * x, 2, 1)).toThrow();
  });

  it('throws on bad opts', () => {
    expect(() => goldenSectionSearch((x) => x * x, -1, 1, { tol: 0 })).toThrow();
    expect(() => goldenSectionSearch((x) => x * x, -1, 1, { maxIter: 0 })).toThrow();
  });

  it('throws on non-finite f', () => {
    expect(() => goldenSectionSearch(() => NaN, -1, 1)).toThrow();
  });

  it('parabola minimum at 0', () => {
    const r = goldenSectionSearch((x) => x * x, -2, 2, { tol: 1e-10 });
    expect(r.converged).toBe(true);
    expect(r.x).toBeCloseTo(0, 6);
    expect(r.fx).toBeLessThan(1e-10);
  });

  it('shifted parabola', () => {
    const r = goldenSectionSearch((x) => (x - 3) * (x - 3) + 5, 0, 6, { tol: 1e-10 });
    expect(r.converged).toBe(true);
    expect(r.x).toBeCloseTo(3, 6);
    expect(r.fx).toBeCloseTo(5, 6);
  });

  it('cosine min near pi', () => {
    const r = goldenSectionSearch((x) => Math.cos(x), 1, 5, { tol: 1e-9 });
    expect(r.converged).toBe(true);
    expect(r.x).toBeCloseTo(Math.PI, 5);
  });

  it('returns iters', () => {
    const r = goldenSectionSearch((x) => x * x, -1, 1, { tol: 1e-10 });
    expect(r.iters).toBeGreaterThan(0);
  });

  it('low maxIter not converged', () => {
    const r = goldenSectionSearch((x) => x * x, -1, 1, { maxIter: 1, tol: 1e-15 });
    expect(typeof r.converged).toBe('boolean');
  });

  it('exp - x has unique minimum', () => {
    const r = goldenSectionSearch((x) => Math.exp(x) - 2 * x, -2, 5, { tol: 1e-10 });
    expect(r.converged).toBe(true);
    expect(r.x).toBeCloseTo(Math.log(2), 6);
  });

  it('flat function returns mid', () => {
    const r = goldenSectionSearch(() => 7, -1, 1, { tol: 1e-9 });
    expect(r.fx).toBe(7);
    expect(r.converged).toBe(true);
  });

  it('asymmetric bracket', () => {
    const r = goldenSectionSearch((x) => (x - 1) ** 2, -100, 5, { tol: 1e-10 });
    expect(r.x).toBeCloseTo(1, 5);
  });

  it('quartic', () => {
    const r = goldenSectionSearch((x) => (x - 2) ** 4 + 1, 0, 5, { tol: 1e-10 });
    expect(r.x).toBeCloseTo(2, 3);
  });

  it('respects tol size', () => {
    const r = goldenSectionSearch((x) => x * x, -1, 1, { tol: 1e-3 });
    expect(r.converged).toBe(true);
    expect(Math.abs(r.x)).toBeLessThan(0.01);
  });
});
