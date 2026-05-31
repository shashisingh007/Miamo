import { describe, it, expect } from 'vitest';
import { levenbergMarquardt } from '../levenbergMarquardt';

describe('levenbergMarquardt', () => {
  it('rejects non-function residualsFn', () => {
    expect(() => levenbergMarquardt(null as unknown as (p: number[]) => number[], [1])).toThrow();
  });

  it('rejects empty initial', () => {
    expect(() => levenbergMarquardt(() => [0], [])).toThrow();
  });

  it('linear y = a*x fit', () => {
    const xs = [0, 1, 2, 3, 4];
    const ys = xs.map((x) => 2 * x);
    const r = levenbergMarquardt(
      (p) => xs.map((x, i) => p[0] * x - ys[i]),
      [0.1],
    );
    expect(r.params[0]).toBeCloseTo(2, 5);
    expect(r.cost).toBeLessThan(1e-8);
  });

  it('linear y = a*x + b fit', () => {
    const xs = [0, 1, 2, 3, 4, 5];
    const ys = xs.map((x) => 3 * x + 1);
    const r = levenbergMarquardt(
      (p) => xs.map((x, i) => p[0] * x + p[1] - ys[i]),
      [0, 0],
    );
    expect(r.params[0]).toBeCloseTo(3, 5);
    expect(r.params[1]).toBeCloseTo(1, 5);
  });

  it('exponential y = a * exp(b*x)', () => {
    const xs = [0, 0.5, 1, 1.5, 2];
    const ys = xs.map((x) => 2.5 * Math.exp(0.7 * x));
    const r = levenbergMarquardt(
      (p) => xs.map((x, i) => p[0] * Math.exp(p[1] * x) - ys[i]),
      [1, 0.1],
    );
    expect(r.params[0]).toBeCloseTo(2.5, 3);
    expect(r.params[1]).toBeCloseTo(0.7, 3);
  });

  it('quadratic y = a*x^2 + b*x + c', () => {
    const xs = [-2, -1, 0, 1, 2, 3];
    const ys = xs.map((x) => 1.5 * x * x - 0.5 * x + 2);
    const r = levenbergMarquardt(
      (p) => xs.map((x, i) => p[0] * x * x + p[1] * x + p[2] - ys[i]),
      [0, 0, 0],
    );
    expect(r.params[0]).toBeCloseTo(1.5, 4);
    expect(r.params[1]).toBeCloseTo(-0.5, 4);
    expect(r.params[2]).toBeCloseTo(2, 4);
  });

  it('zero residual at start converges immediately', () => {
    const r = levenbergMarquardt((p) => [p[0] - 5], [5]);
    expect(r.params[0]).toBeCloseTo(5, 9);
    expect(r.cost).toBeLessThan(1e-12);
  });

  it('reports iteration count', () => {
    const r = levenbergMarquardt(
      (p) => [p[0] - 3, p[1] - 4],
      [0, 0],
    );
    expect(r.iterations).toBeGreaterThan(0);
  });

  it('respects maxIter', () => {
    const r = levenbergMarquardt(
      (p) => [p[0] * p[0] + p[0] - 5],
      [0],
      { maxIter: 1 },
    );
    expect(r.iterations).toBeLessThanOrEqual(1);
  });

  it('non-zero cost when overdetermined inconsistent', () => {
    // points not on any line through given a*x model
    const r = levenbergMarquardt(
      (p) => [p[0] - 1, p[0] - 2, p[0] - 3],
      [0],
    );
    // best fit is mean = 2, residuals = [-1, 0, 1], cost = 2
    expect(r.params[0]).toBeCloseTo(2, 6);
    expect(r.cost).toBeCloseTo(2, 4);
  });

  it('cost decreases', () => {
    const xs = [0, 1, 2, 3];
    const ys = [1, 3, 5, 7];
    const initialCost = xs.reduce((s, x, i) => s + (0 * x + 0 - ys[i]) ** 2, 0);
    const r = levenbergMarquardt(
      (p) => xs.map((x, i) => p[0] * x + p[1] - ys[i]),
      [0, 0],
    );
    expect(r.cost).toBeLessThan(initialCost);
  });

  it('returns converged flag', () => {
    const r = levenbergMarquardt(
      (p) => [p[0] - 7],
      [0],
    );
    expect(typeof r.converged).toBe('boolean');
  });

  it('two-parameter quadratic-style residual', () => {
    // minimize (a-1)^2 + (b-2)^2
    const r = levenbergMarquardt(
      (p) => [p[0] - 1, p[1] - 2],
      [10, -10],
    );
    expect(r.params[0]).toBeCloseTo(1, 6);
    expect(r.params[1]).toBeCloseTo(2, 6);
  });
});
