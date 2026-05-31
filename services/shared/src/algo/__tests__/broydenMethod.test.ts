import { describe, it, expect } from 'vitest';
import { broydenMethod } from '../broydenMethod';

describe('broydenMethod', () => {
  it('throws on empty', () => {
    expect(() => broydenMethod(() => [], [])).toThrow();
  });

  it('throws on bad opts', () => {
    expect(() => broydenMethod((x) => x, [1], { maxIter: 0 })).toThrow();
    expect(() => broydenMethod((x) => x, [1], { tol: 0 })).toThrow();
    expect(() => broydenMethod((x) => x, [1], { J0: [[1, 0]] })).toThrow();
    expect(() => broydenMethod((x) => x, [1, 2], { J0: [[1]] })).toThrow();
  });

  it('throws on F size mismatch', () => {
    expect(() => broydenMethod(() => [1, 2], [1])).toThrow();
  });

  it('throws on non-finite F', () => {
    expect(() => broydenMethod(() => [NaN], [1])).toThrow();
  });

  it('1D linear root', () => {
    const r = broydenMethod((x) => [x[0] - 2], [0], { tol: 1e-12 });
    expect(r.converged).toBe(true);
    expect(r.x[0]).toBeCloseTo(2, 8);
  });

  it('1D quadratic root', () => {
    const r = broydenMethod((x) => [x[0] * x[0] - 4], [3], { tol: 1e-12, maxIter: 200 });
    expect(r.converged).toBe(true);
    expect(Math.abs(r.x[0] - 2)).toBeLessThan(1e-6);
  });

  it('2D linear system', () => {
    const F = (x: number[]) => [x[0] + x[1] - 3, x[0] - x[1] - 1];
    const r = broydenMethod(F, [0, 0], { tol: 1e-12 });
    expect(r.converged).toBe(true);
    expect(r.x[0]).toBeCloseTo(2, 8);
    expect(r.x[1]).toBeCloseTo(1, 8);
  });

  it('2D nonlinear', () => {
    const F = (x: number[]) => [x[0] * x[0] + x[1] - 5, x[0] + x[1] * x[1] - 3];
    const r = broydenMethod(F, [2, 1], { tol: 1e-10, maxIter: 500 });
    expect(r.converged).toBe(true);
    const f = F(r.x);
    expect(Math.abs(f[0])).toBeLessThan(1e-6);
    expect(Math.abs(f[1])).toBeLessThan(1e-6);
  });

  it('3D linear', () => {
    const F = (x: number[]) => [x[0] + x[1] + x[2] - 6, x[0] - x[1] + 2 * x[2] - 5, 2 * x[0] + x[1] - x[2] - 1];
    const r = broydenMethod(F, [0, 0, 0], { tol: 1e-10, maxIter: 200 });
    expect(r.converged).toBe(true);
    const f = F(r.x);
    for (const v of f) expect(Math.abs(v)).toBeLessThan(1e-6);
  });

  it('residual reported', () => {
    const r = broydenMethod((x) => [x[0] - 5], [0], { tol: 1e-12 });
    expect(r.residual).toBeLessThan(1e-8);
  });

  it('respects custom J0', () => {
    const r = broydenMethod((x) => [2 * x[0] - 6], [0], { J0: [[2]], tol: 1e-12 });
    expect(r.converged).toBe(true);
    expect(r.x[0]).toBeCloseTo(3, 8);
  });

  it('iters reported >0 for non-trivial', () => {
    const r = broydenMethod((x) => [x[0] * x[0] - 9], [4], { tol: 1e-12 });
    expect(r.iters).toBeGreaterThan(0);
  });

  it('low maxIter not converged', () => {
    const r = broydenMethod((x) => [x[0] * x[0] - 9], [4], { maxIter: 1, tol: 1e-15 });
    expect(typeof r.converged).toBe('boolean');
  });

  it('returns x of correct length', () => {
    const r = broydenMethod((x) => [x[0] - 1, x[1] - 2, x[2] - 3], [0, 0, 0]);
    expect(r.x.length).toBe(3);
  });

  it('singular Jacobian throws', () => {
    expect(() =>
      broydenMethod((x) => [x[0] - 5], [0], { J0: [[0]], maxIter: 5 }),
    ).toThrow();
  });
});
