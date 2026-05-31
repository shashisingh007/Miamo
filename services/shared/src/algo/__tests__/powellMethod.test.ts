import { describe, it, expect } from 'vitest';
import { powellMethod } from '../powellMethod';

describe('powellMethod', () => {
  it('throws on empty x0', () => {
    expect(() => powellMethod(() => 0, [])).toThrow();
  });

  it('throws on bad opts', () => {
    expect(() => powellMethod(() => 0, [1], { maxIter: 0 })).toThrow();
    expect(() => powellMethod(() => 0, [1], { tol: 0 })).toThrow();
    expect(() => powellMethod(() => 0, [1], { bracket: 0 })).toThrow();
  });

  it('throws on non-finite f', () => {
    expect(() => powellMethod(() => NaN, [0])).toThrow();
  });

  it('1D quadratic', () => {
    const r = powellMethod((x) => (x[0] - 3) ** 2, [0], { tol: 1e-10, bracket: 5 });
    expect(r.converged).toBe(true);
    expect(r.x[0]).toBeCloseTo(3, 4);
  });

  it('2D paraboloid', () => {
    const r = powellMethod(
      (x) => (x[0] - 1) ** 2 + (x[1] + 2) ** 2,
      [0, 0],
      { tol: 1e-10, bracket: 5 },
    );
    expect(r.converged).toBe(true);
    expect(r.x[0]).toBeCloseTo(1, 4);
    expect(r.x[1]).toBeCloseTo(-2, 4);
  });

  it('Rosenbrock approximate', () => {
    const f = (x: number[]) => (1 - x[0]) ** 2 + 100 * (x[1] - x[0] ** 2) ** 2;
    const r = powellMethod(f, [-1, 1], { tol: 1e-10, maxIter: 500, bracket: 2 });
    expect(r.fx).toBeLessThan(1e-3);
  });

  it('reports iters', () => {
    const r = powellMethod((x) => x[0] ** 2, [1], { tol: 1e-10, bracket: 2 });
    expect(r.iters).toBeGreaterThan(0);
  });

  it('low maxIter', () => {
    const r = powellMethod((x) => (x[0] - 100) ** 2, [0], { maxIter: 1, bracket: 1 });
    expect(typeof r.converged).toBe('boolean');
  });

  it('returns x of correct length', () => {
    const r = powellMethod(
      (x) => x[0] ** 2 + x[1] ** 2 + x[2] ** 2,
      [1, 2, 3],
      { bracket: 5 },
    );
    expect(r.x.length).toBe(3);
  });

  it('flat function', () => {
    const r = powellMethod(() => 5, [0, 0]);
    expect(r.fx).toBe(5);
    expect(r.converged).toBe(true);
  });

  it('starts non-zero', () => {
    const r = powellMethod((x) => (x[0] - 7) ** 2, [10], { tol: 1e-10, bracket: 10 });
    expect(r.x[0]).toBeCloseTo(7, 4);
  });

  it('3D sum of squares', () => {
    const r = powellMethod(
      (x) => x.reduce((s, v) => s + v * v, 0),
      [1, -1, 2],
      { tol: 1e-10, bracket: 5, maxIter: 500 },
    );
    expect(r.fx).toBeLessThan(1e-5);
  });

  it('respects bracket', () => {
    const r = powellMethod((x) => (x[0] - 0.1) ** 2, [0], { bracket: 1, tol: 1e-10 });
    expect(r.x[0]).toBeCloseTo(0.1, 4);
  });

  it('converged flag bool', () => {
    const r = powellMethod((x) => x[0] ** 2 + x[1] ** 2, [3, 4], { tol: 1e-10, bracket: 10 });
    expect(typeof r.converged).toBe('boolean');
    expect(r.fx).toBeLessThan(1e-6);
  });

  it('mixed bowl', () => {
    const r = powellMethod(
      (x) => 2 * (x[0] - 1) ** 2 + 3 * (x[1] + 1) ** 2,
      [0, 0],
      { tol: 1e-10, bracket: 5 },
    );
    expect(r.x[0]).toBeCloseTo(1, 4);
    expect(r.x[1]).toBeCloseTo(-1, 4);
  });
});
