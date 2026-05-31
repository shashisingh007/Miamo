import { describe, it, expect } from 'vitest';
import { newtonsMethodRoot } from '../newtonsMethodRoot';

describe('newtonsMethodRoot', () => {
  it('rejects non-function f', () => {
    expect(() => newtonsMethodRoot(42 as any, () => 1, 1)).toThrow(TypeError);
  });

  it('rejects non-function fPrime', () => {
    expect(() => newtonsMethodRoot(() => 0, 42 as any, 1)).toThrow(TypeError);
  });

  it('rejects non-finite x0', () => {
    expect(() => newtonsMethodRoot(() => 0, () => 1, NaN)).toThrow(RangeError);
  });

  it('rejects bad tol', () => {
    expect(() => newtonsMethodRoot(() => 0, () => 1, 0, { tol: 0 })).toThrow(RangeError);
  });

  it('rejects bad maxIter', () => {
    expect(() => newtonsMethodRoot(() => 0, () => 1, 0, { maxIter: 0 })).toThrow(RangeError);
    expect(() => newtonsMethodRoot(() => 0, () => 1, 0, { maxIter: 1.5 })).toThrow(RangeError);
  });

  it('finds sqrt(2)', () => {
    const r = newtonsMethodRoot((x) => x * x - 2, (x) => 2 * x, 1.5);
    expect(r.converged).toBe(true);
    expect(Math.abs(r.root - Math.SQRT2)).toBeLessThan(1e-9);
  });

  it('finds cube root of 27', () => {
    const r = newtonsMethodRoot((x) => x ** 3 - 27, (x) => 3 * x * x, 4);
    expect(r.converged).toBe(true);
    expect(Math.abs(r.root - 3)).toBeLessThan(1e-9);
  });

  it('finds root of cos(x) - x ≈ 0.739085', () => {
    const r = newtonsMethodRoot((x) => Math.cos(x) - x, (x) => -Math.sin(x) - 1, 0);
    expect(r.converged).toBe(true);
    expect(Math.abs(r.root - 0.7390851332151607)).toBeLessThan(1e-9);
  });

  it('immediate convergence when f(x0)=0', () => {
    const r = newtonsMethodRoot((x) => x, () => 1, 0);
    expect(r.iterations).toBe(1);
    expect(r.root).toBe(0);
  });

  it('throws when derivative too small', () => {
    expect(() => newtonsMethodRoot((x) => x * x, () => 0, 1)).toThrow(/derivative too small/);
  });

  it('throws when f produces non-finite', () => {
    expect(() => newtonsMethodRoot(() => NaN, () => 1, 1)).toThrow(/non-finite/);
  });

  it('throws when fPrime produces non-finite', () => {
    expect(() => newtonsMethodRoot((x) => x, () => NaN, 1)).toThrow(/non-finite/);
  });

  it('respects maxIter and reports non-convergence', () => {
    // sqrt(2) needs ~6 iters from x=10; cap at 2 forces non-convergence
    const r = newtonsMethodRoot((x) => x * x - 2, (x) => 2 * x, 10, { maxIter: 2 });
    expect(r.iterations).toBe(2);
    expect(r.converged).toBe(false);
  });

  it('quadratic convergence: few iterations for sqrt', () => {
    const r = newtonsMethodRoot((x) => x * x - 100, (x) => 2 * x, 10.5);
    expect(r.converged).toBe(true);
    expect(r.iterations).toBeLessThan(10);
    expect(Math.abs(r.root - 10)).toBeLessThan(1e-9);
  });

  it('negative root', () => {
    const r = newtonsMethodRoot((x) => x * x - 4, (x) => 2 * x, -3);
    expect(Math.abs(r.root + 2)).toBeLessThan(1e-9);
  });

  it('higher tolerance fewer iterations', () => {
    const a = newtonsMethodRoot((x) => x * x - 2, (x) => 2 * x, 1.5, { tol: 1e-12 });
    const b = newtonsMethodRoot((x) => x * x - 2, (x) => 2 * x, 1.5, { tol: 1e-2 });
    expect(b.iterations).toBeLessThanOrEqual(a.iterations);
  });

  it('linear function converges in 1 step', () => {
    // f(x) = 2x - 6  -> root = 3
    const r = newtonsMethodRoot((x) => 2 * x - 6, () => 2, 0);
    expect(r.converged).toBe(true);
    expect(Math.abs(r.root - 3)).toBeLessThan(1e-12);
  });

  it('accepts custom derivativeMin override', () => {
    // Solve x^2 - 4 = 0 with explicit derivativeMin set
    const r = newtonsMethodRoot((x) => x * x - 4, (x) => 2 * x, 3, { derivativeMin: 1e-20 });
    expect(r.converged).toBe(true);
    expect(Math.abs(r.root - 2)).toBeLessThan(1e-9);
  });
});
