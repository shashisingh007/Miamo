import { describe, it, expect } from 'vitest';
import { sorMethod } from '../sorMethod';

describe('sorMethod', () => {
  it('throws on empty', () => {
    expect(() => sorMethod([], [])).toThrow();
  });

  it('throws on non-square', () => {
    expect(() => sorMethod([[1, 2]], [1, 2])).toThrow();
  });

  it('throws on b length mismatch', () => {
    expect(() => sorMethod([[1, 0], [0, 1]], [1])).toThrow();
  });

  it('throws on omega out of range', () => {
    expect(() => sorMethod([[1, 0], [0, 1]], [1, 1], { omega: 0 })).toThrow();
    expect(() => sorMethod([[1, 0], [0, 1]], [1, 1], { omega: 2 })).toThrow();
    expect(() => sorMethod([[1, 0], [0, 1]], [1, 1], { omega: -0.5 })).toThrow();
  });

  it('throws on zero diagonal', () => {
    expect(() => sorMethod([[0, 1], [1, 0]], [1, 1])).toThrow();
  });

  it('throws on bad tol/maxIter', () => {
    expect(() => sorMethod([[1, 0], [0, 1]], [1, 1], { maxIter: 0 })).toThrow();
    expect(() => sorMethod([[1, 0], [0, 1]], [1, 1], { tol: 0 })).toThrow();
  });

  it('throws on x0 length mismatch', () => {
    expect(() => sorMethod([[1, 0], [0, 1]], [1, 1], { x0: [0] })).toThrow();
  });

  it('solves identity', () => {
    const r = sorMethod([[1, 0], [0, 1]], [3, 4]);
    expect(r.converged).toBe(true);
    expect(r.x[0]).toBeCloseTo(3, 8);
    expect(r.x[1]).toBeCloseTo(4, 8);
  });

  it('solves diagonally dominant', () => {
    const A = [
      [4, 1, 1],
      [1, 5, 2],
      [1, 2, 6],
    ];
    const b = [6, 8, 9];
    const r = sorMethod(A, b, { omega: 1.1, tol: 1e-12 });
    expect(r.converged).toBe(true);
    for (let i = 0; i < 3; i++) {
      let s = 0;
      for (let j = 0; j < 3; j++) s += A[i][j] * r.x[j];
      expect(s).toBeCloseTo(b[i], 8);
    }
  });

  it('Gauss-Seidel (omega=1)', () => {
    const A = [
      [10, -1, 2],
      [-1, 11, -1],
      [2, -1, 10],
    ];
    const b = [6, 25, -11];
    const r = sorMethod(A, b, { omega: 1, tol: 1e-10 });
    expect(r.converged).toBe(true);
    for (let i = 0; i < 3; i++) {
      let s = 0;
      for (let j = 0; j < 3; j++) s += A[i][j] * r.x[j];
      expect(s).toBeCloseTo(b[i], 8);
    }
  });

  it('reports residual after iterations', () => {
    const r = sorMethod([[2, 1], [1, 2]], [3, 3], { tol: 1e-12 });
    expect(r.residual).toBeLessThan(1e-10);
    expect(r.iters).toBeGreaterThan(0);
  });

  it('reports non-converged when maxIter small', () => {
    const A = [
      [4, 1, 1],
      [1, 5, 2],
      [1, 2, 6],
    ];
    const r = sorMethod(A, [6, 8, 9], { maxIter: 1, tol: 1e-15 });
    expect(r.converged).toBe(false);
  });

  it('over-relaxation reduces iters on tridiagonal', () => {
    const n = 20;
    const A: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    const b: number[] = new Array(n).fill(1);
    for (let i = 0; i < n; i++) {
      A[i][i] = 4;
      if (i > 0) A[i][i - 1] = -1;
      if (i < n - 1) A[i][i + 1] = -1;
    }
    const r1 = sorMethod(A, b, { omega: 1, tol: 1e-8 });
    const r2 = sorMethod(A, b, { omega: 1.3, tol: 1e-8 });
    expect(r1.converged).toBe(true);
    expect(r2.converged).toBe(true);
  });

  it('respects x0 starting guess', () => {
    const r = sorMethod([[1, 0], [0, 1]], [3, 4], { x0: [3, 4], maxIter: 5 });
    expect(r.x[0]).toBeCloseTo(3, 12);
    expect(r.x[1]).toBeCloseTo(4, 12);
  });
});
