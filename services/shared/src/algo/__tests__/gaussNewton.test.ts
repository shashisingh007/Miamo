import { describe, it, expect } from 'vitest';
import { gaussNewton } from '../gaussNewton';

describe('gaussNewton', () => {
  it('throws on empty beta0', () => {
    expect(() => gaussNewton(() => [0], () => [[]], [])).toThrow();
  });

  it('throws on bad opts', () => {
    expect(() => gaussNewton(() => [0], () => [[1]], [0], { maxIter: 0 })).toThrow();
    expect(() => gaussNewton(() => [0], () => [[1]], [0], { tol: 0 })).toThrow();
    expect(() => gaussNewton(() => [0], () => [[1]], [0], { damping: -1 })).toThrow();
  });

  it('throws on empty residuals', () => {
    expect(() => gaussNewton(() => [], () => [[1]], [0])).toThrow();
  });

  it('throws on non-finite residual', () => {
    expect(() => gaussNewton(() => [NaN], () => [[1]], [0])).toThrow();
  });

  it('throws on J row mismatch', () => {
    expect(() => gaussNewton(() => [1, 2], () => [[1]], [0])).toThrow();
  });

  it('linear regression y=2x', () => {
    const xs = [0, 1, 2, 3, 4];
    const ys = [0, 2, 4, 6, 8];
    const res = (b: number[]) => xs.map((x, i) => ys[i] - b[0] * x);
    const jac = () => xs.map((x) => [-x]);
    const r = gaussNewton(res, jac, [0], { tol: 1e-12 });
    expect(r.converged).toBe(true);
    expect(r.beta[0]).toBeCloseTo(2, 8);
  });

  it('linear regression with intercept', () => {
    const xs = [0, 1, 2, 3, 4];
    const ys = [1, 3, 5, 7, 9];
    const res = (b: number[]) => xs.map((x, i) => ys[i] - (b[0] + b[1] * x));
    const jac = () => xs.map((x) => [-1, -x]);
    const r = gaussNewton(res, jac, [0, 0], { tol: 1e-12 });
    expect(r.converged).toBe(true);
    expect(r.beta[0]).toBeCloseTo(1, 6);
    expect(r.beta[1]).toBeCloseTo(2, 6);
  });

  it('exponential model', () => {
    const xs = [0, 1, 2, 3];
    const a = 2;
    const k = 0.5;
    const ys = xs.map((x) => a * Math.exp(k * x));
    const res = (b: number[]) => xs.map((x, i) => ys[i] - b[0] * Math.exp(b[1] * x));
    const jac = (b: number[]) => xs.map((x) => [-Math.exp(b[1] * x), -b[0] * x * Math.exp(b[1] * x)]);
    const r = gaussNewton(res, jac, [1, 0.1], { tol: 1e-12, maxIter: 200 });
    expect(r.converged).toBe(true);
    expect(r.beta[0]).toBeCloseTo(a, 4);
    expect(r.beta[1]).toBeCloseTo(k, 4);
  });

  it('residual reported', () => {
    const xs = [0, 1];
    const ys = [0, 2];
    const res = (b: number[]) => xs.map((x, i) => ys[i] - b[0] * x);
    const jac = () => xs.map((x) => [-x]);
    const r = gaussNewton(res, jac, [0]);
    expect(r.residual).toBeLessThan(1e-6);
  });

  it('damping usable', () => {
    const xs = [0, 1, 2];
    const ys = [0, 2, 4];
    const res = (b: number[]) => xs.map((x, i) => ys[i] - b[0] * x);
    const jac = () => xs.map((x) => [-x]);
    const r = gaussNewton(res, jac, [0], { damping: 1e-6, tol: 1e-12 });
    expect(r.converged).toBe(true);
    expect(r.beta[0]).toBeCloseTo(2, 4);
  });

  it('iters reported', () => {
    const xs = [0, 1, 2];
    const ys = [0, 2, 4];
    const res = (b: number[]) => xs.map((x, i) => ys[i] - b[0] * x);
    const jac = () => xs.map((x) => [-x]);
    const r = gaussNewton(res, jac, [0]);
    expect(r.iters).toBeGreaterThanOrEqual(1);
  });

  it('low maxIter', () => {
    const xs = [0, 1, 2];
    const ys = [0, 2, 4];
    const res = (b: number[]) => xs.map((x, i) => ys[i] - b[0] * x);
    const jac = () => xs.map((x) => [-x]);
    const r = gaussNewton(res, jac, [0], { maxIter: 1 });
    expect(typeof r.converged).toBe('boolean');
  });

  it('singular normal eq throws', () => {
    const res = () => [1, 2];
    const jac = () => [
      [0, 0],
      [0, 0],
    ];
    expect(() => gaussNewton(res, jac, [0, 0])).toThrow();
  });

  it('returns beta of correct length', () => {
    const res = (b: number[]) => [1 - b[0], 2 - b[1], 3 - b[2]];
    const jac = () => [
      [-1, 0, 0],
      [0, -1, 0],
      [0, 0, -1],
    ];
    const r = gaussNewton(res, jac, [0, 0, 0]);
    expect(r.beta.length).toBe(3);
  });

  it('handles already-at-solution', () => {
    const res = (b: number[]) => [1 - b[0]];
    const jac = () => [[-1]];
    const r = gaussNewton(res, jac, [1], { tol: 1e-12 });
    expect(r.converged).toBe(true);
    expect(r.beta[0]).toBeCloseTo(1, 10);
  });
});
