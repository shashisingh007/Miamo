import { describe, it, expect } from 'vitest';
import { biCgStab } from '../biCgStab';

describe('biCgStab', () => {
  it('throws on empty', () => {
    expect(() => biCgStab([], [])).toThrow();
  });

  it('throws on non-square', () => {
    expect(() => biCgStab([[1, 2]], [1, 2])).toThrow();
  });

  it('throws on b mismatch', () => {
    expect(() => biCgStab([[1, 0], [0, 1]], [1])).toThrow();
  });

  it('throws on bad opts', () => {
    expect(() => biCgStab([[1, 0], [0, 1]], [1, 1], { maxIter: 0 })).toThrow();
    expect(() => biCgStab([[1, 0], [0, 1]], [1, 1], { tol: 0 })).toThrow();
    expect(() => biCgStab([[1, 0], [0, 1]], [1, 1], { x0: [0] })).toThrow();
  });

  it('solves identity', () => {
    const r = biCgStab([[1, 0], [0, 1]], [3, 4]);
    expect(r.converged).toBe(true);
    expect(r.x[0]).toBeCloseTo(3, 8);
    expect(r.x[1]).toBeCloseTo(4, 8);
  });

  it('solves SPD 2x2', () => {
    const A = [
      [4, 1],
      [1, 3],
    ];
    const b = [9, 8];
    const r = biCgStab(A, b, { tol: 1e-12 });
    expect(r.converged).toBe(true);
    expect(r.x[0]).toBeCloseTo(19 / 11, 8);
    expect(r.x[1]).toBeCloseTo(23 / 11, 8);
  });

  it('solves non-symmetric 3x3', () => {
    const A = [
      [3, 1, 0],
      [-1, 4, 1],
      [0, -2, 5],
    ];
    const b = [4, 6, 7];
    const r = biCgStab(A, b, { tol: 1e-10, maxIter: 200 });
    expect(r.converged).toBe(true);
    for (let i = 0; i < 3; i++) {
      let s = 0;
      for (let j = 0; j < 3; j++) s += A[i][j] * r.x[j];
      expect(s).toBeCloseTo(b[i], 6);
    }
  });

  it('respects x0', () => {
    const r = biCgStab([[1, 0], [0, 1]], [3, 4], { x0: [3, 4] });
    expect(r.iters).toBe(0);
    expect(r.converged).toBe(true);
  });

  it('zero rhs => zero solution', () => {
    const r = biCgStab([[2, 0], [0, 3]], [0, 0]);
    expect(r.x[0]).toBeCloseTo(0, 12);
    expect(r.x[1]).toBeCloseTo(0, 12);
  });

  it('larger tridiagonal', () => {
    const n = 20;
    const A: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      A[i][i] = 4;
      if (i > 0) A[i][i - 1] = -1;
      if (i < n - 1) A[i][i + 1] = -1;
    }
    const b = new Array(n).fill(1);
    const r = biCgStab(A, b, { tol: 1e-10, maxIter: 1000 });
    expect(r.converged).toBe(true);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = 0; j < n; j++) s += A[i][j] * r.x[j];
      expect(s).toBeCloseTo(b[i], 6);
    }
  });

  it('non-symmetric tridiagonal', () => {
    const n = 10;
    const A: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      A[i][i] = 4;
      if (i > 0) A[i][i - 1] = -2;
      if (i < n - 1) A[i][i + 1] = 1;
    }
    const b = new Array(n).fill(1);
    const r = biCgStab(A, b, { tol: 1e-10, maxIter: 1000 });
    expect(r.converged).toBe(true);
  });

  it('residual reported', () => {
    const r = biCgStab([[2, 0], [0, 3]], [4, 9], { tol: 1e-12 });
    expect(r.residual).toBeLessThan(1e-9);
  });

  it('reports non-converged', () => {
    const A = [
      [4, 1],
      [1, 3],
    ];
    const r = biCgStab(A, [9, 8], { maxIter: 1, tol: 1e-15 });
    expect(r.converged).toBe(false);
  });

  it('returns finite x', () => {
    const r = biCgStab([[5, 1], [2, 4]], [6, 8]);
    for (const v of r.x) expect(Number.isFinite(v)).toBe(true);
  });

  it('1x1', () => {
    const r = biCgStab([[5]], [10]);
    expect(r.x[0]).toBeCloseTo(2, 10);
  });

  it('iters > 0 from non-trivial start', () => {
    const r = biCgStab([[4, 1], [1, 3]], [9, 8], { tol: 1e-12 });
    expect(r.iters).toBeGreaterThan(0);
  });
});
