import { describe, it, expect } from 'vitest';
import { matrixInverse } from '../matrixInverse';

function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length, n = B[0].length, k = B.length;
  const C: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++) {
      let s = 0;
      for (let p = 0; p < k; p++) s += A[i][p] * B[p][j];
      C[i][j] = s;
    }
  return C;
}

function approxIdentity(M: number[][], tol = 1e-8): boolean {
  const n = M.length;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const want = i === j ? 1 : 0;
      if (Math.abs(M[i][j] - want) > tol) return false;
    }
  return true;
}

describe('matrixInverse', () => {
  it('inverts 2x2', () => {
    const A = [[4, 7], [2, 6]];
    const Ainv = matrixInverse(A);
    expect(approxIdentity(matMul(A, Ainv))).toBe(true);
  });

  it('inverts 3x3', () => {
    const A = [[1, 2, 3], [0, 1, 4], [5, 6, 0]];
    const Ainv = matrixInverse(A);
    expect(approxIdentity(matMul(A, Ainv))).toBe(true);
  });

  it('identity is its own inverse', () => {
    const I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const Iinv = matrixInverse(I);
    expect(approxIdentity(Iinv)).toBe(true);
  });

  it('inv(inv(A)) == A', () => {
    const A = [[2, 1], [1, 3]];
    const Ainv = matrixInverse(A);
    const Aback = matrixInverse(Ainv);
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++)
        expect(Math.abs(Aback[i][j] - A[i][j])).toBeLessThan(1e-8);
  });

  it('requires partial pivoting (zero leading pivot)', () => {
    const A = [[0, 1], [1, 0]];
    const Ainv = matrixInverse(A);
    expect(approxIdentity(matMul(A, Ainv))).toBe(true);
  });

  it('1x1 inversion', () => {
    expect(matrixInverse([[5]])[0][0]).toBeCloseTo(0.2, 10);
  });

  it('rejects empty', () => {
    expect(() => matrixInverse([])).toThrow();
  });

  it('rejects non-square', () => {
    expect(() => matrixInverse([[1, 2, 3], [4, 5, 6]])).toThrow();
  });

  it('rejects singular', () => {
    expect(() => matrixInverse([[1, 2], [2, 4]])).toThrow(/singular/);
  });

  it('handles negative entries', () => {
    const A = [[-3, 1], [4, -2]];
    const Ainv = matrixInverse(A);
    expect(approxIdentity(matMul(A, Ainv))).toBe(true);
  });

  it('preserves input matrix', () => {
    const A = [[2, 0], [0, 3]];
    const snapshot = A.map((r) => r.slice());
    matrixInverse(A);
    expect(A).toEqual(snapshot);
  });
});
