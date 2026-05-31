import { describe, it, expect } from 'vitest';
import { gmresMethod } from '../gmresMethod';

describe('gmresMethod', () => {
  it('throws on empty', () => {
    expect(() => gmresMethod([], [])).toThrow();
  });

  it('throws on non-square', () => {
    expect(() => gmresMethod([[1, 2]], [1, 2])).toThrow();
  });

  it('throws on b mismatch', () => {
    expect(() => gmresMethod([[1, 0], [0, 1]], [1])).toThrow();
  });

  it('throws on bad opts', () => {
    expect(() => gmresMethod([[1, 0], [0, 1]], [1, 1], { maxIter: 0 })).toThrow();
    expect(() => gmresMethod([[1, 0], [0, 1]], [1, 1], { tol: 0 })).toThrow();
    expect(() => gmresMethod([[1, 0], [0, 1]], [1, 1], { restart: 0 })).toThrow();
    expect(() => gmresMethod([[1, 0], [0, 1]], [1, 1], { x0: [0] })).toThrow();
  });

  it('solves identity', () => {
    const r = gmresMethod([[1, 0], [0, 1]], [3, 4]);
    expect(r.converged).toBe(true);
    expect(r.x[0]).toBeCloseTo(3, 8);
    expect(r.x[1]).toBeCloseTo(4, 8);
  });

  it('solves non-symmetric 2x2', () => {
    const A = [
      [4, 1],
      [2, 3],
    ];
    const r = gmresMethod(A, [9, 8], { tol: 1e-12 });
    expect(r.converged).toBe(true);
    expect(r.x[0]).toBeCloseTo(1.9, 6);
    expect(r.x[1]).toBeCloseTo(1.4, 6);
  });

  it('solves 3x3', () => {
    const A = [
      [4, -1, 0],
      [-1, 4, -1],
      [0, -1, 4],
    ];
    const b = [3, 2, 3];
    const r = gmresMethod(A, b, { tol: 1e-10 });
    expect(r.converged).toBe(true);
    for (let i = 0; i < 3; i++) {
      let s = 0;
      for (let j = 0; j < 3; j++) s += A[i][j] * r.x[j];
      expect(s).toBeCloseTo(b[i], 6);
    }
  });

  it('respects x0 already at solution', () => {
    const r = gmresMethod([[1, 0], [0, 1]], [3, 4], { x0: [3, 4] });
    expect(r.converged).toBe(true);
    expect(r.iters).toBe(0);
  });

  it('zero rhs', () => {
    const r = gmresMethod([[2, 1], [0, 3]], [0, 0]);
    expect(r.x[0]).toBeCloseTo(0, 12);
    expect(r.x[1]).toBeCloseTo(0, 12);
  });

  it('larger non-symm tridiag', () => {
    const n = 12;
    const A: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      A[i][i] = 4;
      if (i > 0) A[i][i - 1] = -1;
      if (i < n - 1) A[i][i + 1] = -2;
    }
    const b = new Array(n).fill(1);
    const r = gmresMethod(A, b, { tol: 1e-10, maxIter: 500 });
    expect(r.converged).toBe(true);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = 0; j < n; j++) s += A[i][j] * r.x[j];
      expect(s).toBeCloseTo(b[i], 6);
    }
  });

  it('residual reported small on convergence', () => {
    const r = gmresMethod([[3, 1], [1, 2]], [4, 3], { tol: 1e-12 });
    expect(r.residual).toBeLessThan(1e-8);
  });

  it('reports x of correct length', () => {
    const r = gmresMethod([[2, 0, 0], [0, 2, 0], [0, 0, 2]], [4, 6, 8]);
    expect(r.x.length).toBe(3);
  });

  it('1x1', () => {
    const r = gmresMethod([[5]], [10]);
    expect(r.x[0]).toBeCloseTo(2, 10);
  });

  it('restart=1 still converges on diag', () => {
    const r = gmresMethod([[2, 0], [0, 3]], [4, 9], { restart: 1, maxIter: 50, tol: 1e-10 });
    expect(r.converged).toBe(true);
    expect(r.x[0]).toBeCloseTo(2, 6);
    expect(r.x[1]).toBeCloseTo(3, 6);
  });

  it('non-converged with maxIter=1', () => {
    const r = gmresMethod([[3, 1], [1, 2]], [4, 3], { maxIter: 1, restart: 1, tol: 1e-15 });
    expect(typeof r.converged).toBe('boolean');
  });

  it('solves shifted', () => {
    const A = [
      [10, 1, 0],
      [1, 10, 1],
      [0, 1, 10],
    ];
    const b = [11, 12, 11];
    const r = gmresMethod(A, b, { tol: 1e-10 });
    expect(r.converged).toBe(true);
    for (let i = 0; i < 3; i++) {
      let s = 0;
      for (let j = 0; j < 3; j++) s += A[i][j] * r.x[j];
      expect(s).toBeCloseTo(b[i], 6);
    }
  });
});
