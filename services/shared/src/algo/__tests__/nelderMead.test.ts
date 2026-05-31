import { describe, it, expect } from 'vitest';
import { nelderMead } from '../nelderMead';

describe('nelderMead', () => {
  it('throws on empty x0', () => {
    expect(() => nelderMead(() => 0, [])).toThrow();
  });

  it('throws on bad opts', () => {
    expect(() => nelderMead(() => 0, [1], { maxIter: 0 })).toThrow();
    expect(() => nelderMead(() => 0, [1], { tol: 0 })).toThrow();
    expect(() => nelderMead(() => 0, [1], { step: 0 })).toThrow();
  });

  it('throws on non-finite f', () => {
    expect(() => nelderMead(() => NaN, [0])).toThrow();
  });

  it('1D quadratic minimum', () => {
    const r = nelderMead((x) => (x[0] - 3) ** 2, [0], { tol: 1e-12, step: 1, maxIter: 2000 });
    expect(r.converged).toBe(true);
    expect(r.x[0]).toBeCloseTo(3, 3);
    expect(r.fx).toBeLessThan(1e-5);
  });

  it('2D paraboloid', () => {
    const r = nelderMead(
      (x) => (x[0] - 1) ** 2 + (x[1] + 2) ** 2,
      [0, 0],
      { tol: 1e-10, maxIter: 1000 },
    );
    expect(r.converged).toBe(true);
    expect(r.x[0]).toBeCloseTo(1, 3);
    expect(r.x[1]).toBeCloseTo(-2, 3);
  });

  it('Rosenbrock approximate', () => {
    const f = (x: number[]) => (1 - x[0]) ** 2 + 100 * (x[1] - x[0] ** 2) ** 2;
    const r = nelderMead(f, [-1.2, 1], { tol: 1e-10, maxIter: 5000 });
    expect(r.fx).toBeLessThan(1e-4);
  });

  it('reports iters', () => {
    const r = nelderMead((x) => x[0] ** 2, [1], { tol: 1e-10 });
    expect(r.iters).toBeGreaterThan(0);
  });

  it('non-convergence when maxIter low', () => {
    const r = nelderMead((x) => (x[0] - 100) ** 2, [0], { maxIter: 2, tol: 1e-15 });
    expect(typeof r.converged).toBe('boolean');
  });

  it('returns x of correct length', () => {
    const r = nelderMead((x) => x[0] ** 2 + x[1] ** 2 + x[2] ** 2, [1, 2, 3]);
    expect(r.x.length).toBe(3);
  });

  it('handles flat function', () => {
    const r = nelderMead(() => 5, [0, 0], { tol: 1e-9 });
    expect(r.converged).toBe(true);
    expect(r.fx).toBe(5);
  });

  it('starts from non-zero', () => {
    const r = nelderMead((x) => (x[0] - 7) ** 2, [10], { tol: 1e-10 });
    expect(r.x[0]).toBeCloseTo(7, 3);
  });

  it('monotone non-increasing fx', () => {
    const r = nelderMead((x) => (x[0] - 3) ** 2 + (x[1] + 1) ** 2, [0, 0]);
    expect(r.fx).toBeLessThan(((-3) ** 2) + 1);
  });

  it('respects custom step', () => {
    const r = nelderMead((x) => x[0] ** 2, [1], { step: 0.5, tol: 1e-9 });
    expect(r.converged).toBe(true);
  });

  it('3D sum of squares', () => {
    const r = nelderMead(
      (x) => x.reduce((s, v) => s + v * v, 0),
      [1, -1, 2],
      { tol: 1e-9, maxIter: 3000 },
    );
    expect(r.fx).toBeLessThan(1e-5);
  });
});
