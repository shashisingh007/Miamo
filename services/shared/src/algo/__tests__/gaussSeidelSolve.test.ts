import { describe, it, expect } from 'vitest';
import { gaussSeidelSolve } from '../gaussSeidelSolve';

function residual(A: number[][], x: number[], b: number[]): number {
  let max = 0;
  for (let i = 0; i < A.length; i++) {
    let s = 0;
    for (let j = 0; j < A.length; j++) s += A[i][j] * x[j];
    max = Math.max(max, Math.abs(s - b[i]));
  }
  return max;
}

describe('gaussSeidelSolve', () => {
  it('solves diagonal system in one sweep', () => {
    const A = [
      [4, 0, 0],
      [0, 5, 0],
      [0, 0, 6],
    ];
    const r = gaussSeidelSolve(A, [8, 10, 18]);
    expect(r.converged).toBe(true);
    expect(r.x[0]).toBeCloseTo(2, 9);
    expect(r.x[1]).toBeCloseTo(2, 9);
    expect(r.x[2]).toBeCloseTo(3, 9);
  });

  it('solves diagonally dominant 3x3', () => {
    const A = [
      [10, -1, 2],
      [-1, 11, -1],
      [2, -1, 10],
    ];
    const b = [6, 25, -11];
    const r = gaussSeidelSolve(A, b);
    expect(r.converged).toBe(true);
    expect(residual(A, r.x, b)).toBeLessThan(1e-7);
  });

  it('rejects square mismatch', () => {
    expect(() => gaussSeidelSolve([[1, 2]], [1])).toThrow();
  });

  it('rejects rectangular A', () => {
    expect(() => gaussSeidelSolve([[1], [2]], [1, 2])).toThrow();
  });

  it('rejects zero diagonal', () => {
    expect(() => gaussSeidelSolve([[0, 1], [1, 1]], [1, 1])).toThrow();
  });

  it('zero rhs gives zero solution and converges quickly', () => {
    const r = gaussSeidelSolve([[5, 1], [1, 5]], [0, 0]);
    expect(r.x).toEqual([0, 0]);
    expect(r.converged).toBe(true);
  });

  it('respects tol setting', () => {
    const A = [
      [4, 1],
      [1, 3],
    ];
    const r = gaussSeidelSolve(A, [1, 2], { tol: 1e-3 });
    expect(r.residualNorm).toBeLessThanOrEqual(1e-2);
  });

  it('reports non-convergence under tight maxIter', () => {
    const A = [
      [4, 1],
      [1, 3],
    ];
    const r = gaussSeidelSolve(A, [1, 2], { maxIter: 1, tol: 1e-15 });
    expect(r.iterations).toBe(1);
    expect(r.converged).toBe(false);
  });

  it('1x1 trivial', () => {
    const r = gaussSeidelSolve([[7]], [14]);
    expect(r.x).toEqual([2]);
    expect(r.converged).toBe(true);
  });

  it('solves SPD tridiagonal 5x5', () => {
    const n = 5;
    const A: number[][] = [];
    for (let i = 0; i < n; i++) {
      const row: number[] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) row.push(4);
        else if (Math.abs(i - j) === 1) row.push(-1);
        else row.push(0);
      }
      A.push(row);
    }
    const b = [1, 2, 3, 4, 5];
    const r = gaussSeidelSolve(A, b);
    expect(r.converged).toBe(true);
    expect(residual(A, r.x, b)).toBeLessThan(1e-7);
  });
});
