import { describe, it, expect } from 'vitest';
import { conjugateGradient } from '../conjugateGradient';

function residual(A: number[][], x: number[], b: number[]): number {
  let max = 0;
  for (let i = 0; i < A.length; i++) {
    let s = 0;
    for (let j = 0; j < A.length; j++) s += A[i][j] * x[j];
    max = Math.max(max, Math.abs(s - b[i]));
  }
  return max;
}

describe('conjugateGradient', () => {
  it('solves 2x2 SPD system', () => {
    const A = [
      [4, 1],
      [1, 3],
    ];
    const b = [1, 2];
    const r = conjugateGradient(A, b);
    expect(r.converged).toBe(true);
    expect(residual(A, r.x, b)).toBeLessThan(1e-8);
  });

  it('solves identity returns b', () => {
    const A = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
    const r = conjugateGradient(A, [3, -2, 7]);
    expect(r.x[0]).toBeCloseTo(3, 9);
    expect(r.x[1]).toBeCloseTo(-2, 9);
    expect(r.x[2]).toBeCloseTo(7, 9);
  });

  it('zero rhs gives zero solution', () => {
    const r = conjugateGradient([[2, 0], [0, 3]], [0, 0]);
    expect(r.x).toEqual([0, 0]);
    expect(r.iterations).toBe(0);
  });

  it('converges within n iterations on diagonal', () => {
    const A = [
      [5, 0, 0, 0],
      [0, 7, 0, 0],
      [0, 0, 11, 0],
      [0, 0, 0, 13],
    ];
    const r = conjugateGradient(A, [1, 1, 1, 1]);
    expect(r.converged).toBe(true);
    expect(r.iterations).toBeLessThanOrEqual(4);
  });

  it('rejects non-square matrix', () => {
    expect(() => conjugateGradient([[1, 2]], [1])).toThrow();
  });

  it('rejects mismatched dimensions', () => {
    expect(() => conjugateGradient([[1, 0], [0, 1]], [1, 2, 3])).toThrow();
  });

  it('respects custom tolerance', () => {
    const A = [
      [4, 1],
      [1, 3],
    ];
    const r = conjugateGradient(A, [1, 2], { tol: 1e-3 });
    expect(r.residualNorm).toBeLessThanOrEqual(1e-3);
  });

  it('handles 5x5 SPD (tridiagonal)', () => {
    const n = 5;
    const A: number[][] = [];
    for (let i = 0; i < n; i++) {
      const row: number[] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) row.push(2);
        else if (Math.abs(i - j) === 1) row.push(-1);
        else row.push(0);
      }
      A.push(row);
    }
    const b = [1, 2, 3, 4, 5];
    const r = conjugateGradient(A, b);
    expect(r.converged).toBe(true);
    expect(residual(A, r.x, b)).toBeLessThan(1e-7);
  });

  it('reports non-convergence under tight maxIter', () => {
    const n = 5;
    const A: number[][] = [];
    for (let i = 0; i < n; i++) {
      const row: number[] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) row.push(2);
        else if (Math.abs(i - j) === 1) row.push(-1);
        else row.push(0);
      }
      A.push(row);
    }
    const r = conjugateGradient(A, [1, 2, 3, 4, 5], { maxIter: 1, tol: 1e-15 });
    expect(r.converged).toBe(false);
    expect(r.iterations).toBe(1);
  });

  it('returns initial zero when b is already zero (single dim)', () => {
    const r = conjugateGradient([[5]], [0]);
    expect(r.x).toEqual([0]);
  });
});
