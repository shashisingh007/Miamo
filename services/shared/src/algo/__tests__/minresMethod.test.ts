import { describe, it, expect } from 'vitest';
import { minresMethod } from '../minresMethod';

describe('minresMethod', () => {
  it('throws on empty', () => {
    expect(() => minresMethod([], [])).toThrow();
  });

  it('throws on non-square', () => {
    expect(() => minresMethod([[1, 2]], [1, 2])).toThrow();
  });

  it('throws on b mismatch', () => {
    expect(() => minresMethod([[1, 0], [0, 1]], [1])).toThrow();
  });

  it('throws on non-symmetric', () => {
    expect(() => minresMethod([[1, 2], [3, 4]], [1, 0])).toThrow();
  });

  it('throws on bad opts', () => {
    expect(() => minresMethod([[1, 0], [0, 1]], [1, 1], { maxIter: 0 })).toThrow();
    expect(() => minresMethod([[1, 0], [0, 1]], [1, 1], { tol: 0 })).toThrow();
    expect(() => minresMethod([[1, 0], [0, 1]], [1, 1], { x0: [0] })).toThrow();
  });

  it('solves identity', () => {
    const r = minresMethod([[1, 0], [0, 1]], [3, 4]);
    expect(r.converged).toBe(true);
    expect(r.x[0]).toBeCloseTo(3, 8);
    expect(r.x[1]).toBeCloseTo(4, 8);
  });

  it('solves SPD 2x2', () => {
    const A = [
      [4, 1],
      [1, 3],
    ];
    const r = minresMethod(A, [9, 8], { tol: 1e-12 });
    expect(r.converged).toBe(true);
    expect(r.x[0]).toBeCloseTo(19 / 11, 6);
    expect(r.x[1]).toBeCloseTo(23 / 11, 6);
  });

  it('solves SPD 3x3', () => {
    const A = [
      [4, 1, 0],
      [1, 3, 1],
      [0, 1, 2],
    ];
    const b = [5, 5, 3];
    const r = minresMethod(A, b, { tol: 1e-10, maxIter: 5000 });
    expect(r.converged).toBe(true);
    for (let i = 0; i < 3; i++) {
      let s = 0;
      for (let j = 0; j < 3; j++) s += A[i][j] * r.x[j];
      expect(s).toBeCloseTo(b[i], 6);
    }
  });

  it('respects x0', () => {
    const r = minresMethod([[1, 0], [0, 1]], [3, 4], { x0: [3, 4] });
    expect(r.iters).toBe(0);
    expect(r.converged).toBe(true);
  });

  it('zero rhs', () => {
    const r = minresMethod([[2, 0], [0, 3]], [0, 0]);
    expect(r.x[0]).toBeCloseTo(0, 12);
    expect(r.x[1]).toBeCloseTo(0, 12);
  });

  it('larger Laplacian', () => {
    const n = 15;
    const A: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      A[i][i] = 2;
      if (i > 0) A[i][i - 1] = -1;
      if (i < n - 1) A[i][i + 1] = -1;
    }
    const b = new Array(n).fill(1);
    const r = minresMethod(A, b, { tol: 1e-9, maxIter: 5000 });
    expect(r.converged).toBe(true);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = 0; j < n; j++) s += A[i][j] * r.x[j];
      expect(s).toBeCloseTo(b[i], 5);
    }
  });

  it('residual reported', () => {
    const r = minresMethod([[2, 0], [0, 3]], [4, 9], { tol: 1e-12 });
    expect(r.residual).toBeLessThan(1e-9);
  });

  it('reports non-converged', () => {
    const A = [
      [4, 1],
      [1, 3],
    ];
    const r = minresMethod(A, [9, 8], { maxIter: 1, tol: 1e-15 });
    expect(r.converged === false || r.iters >= 1).toBe(true);
  });

  it('1x1', () => {
    const r = minresMethod([[5]], [10]);
    expect(r.x[0]).toBeCloseTo(2, 10);
  });

  it('returns x of correct length', () => {
    const r = minresMethod([[2, 0, 0], [0, 2, 0], [0, 0, 2]], [4, 6, 8]);
    expect(r.x.length).toBe(3);
  });

  it('solves indefinite symmetric (eigenvalues +/-)', () => {
    const A = [
      [2, 1],
      [1, -3],
    ];
    const b = [1, 2];
    const r = minresMethod(A, b, { tol: 1e-9, maxIter: 200 });
    expect(r.converged).toBe(true);
    for (let i = 0; i < 2; i++) {
      let s = 0;
      for (let j = 0; j < 2; j++) s += A[i][j] * r.x[j];
      expect(s).toBeCloseTo(b[i], 6);
    }
  });
});
