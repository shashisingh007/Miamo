import { describe, it, expect } from 'vitest';
import { qrDecompose } from '../qrDecompose';

function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length, n = B[0].length, k = B.length;
  const C: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) {
    let s = 0;
    for (let p = 0; p < k; p++) s += A[i][p] * B[p][j];
    C[i][j] = s;
  }
  return C;
}

function approxEq(A: number[][], B: number[][], tol = 1e-8): boolean {
  if (A.length !== B.length) return false;
  for (let i = 0; i < A.length; i++) {
    if (A[i].length !== B[i].length) return false;
    for (let j = 0; j < A[i].length; j++) if (Math.abs(A[i][j] - B[i][j]) > tol) return false;
  }
  return true;
}

describe('qrDecompose', () => {
  it('Q*R reconstructs A (square)', () => {
    const A = [[12, -51, 4], [6, 167, -68], [-4, 24, -41]];
    const { Q, R } = qrDecompose(A);
    expect(approxEq(matMul(Q, R), A, 1e-6)).toBe(true);
  });

  it('Q is orthogonal', () => {
    const A = [[1, 2], [3, 4], [5, 6]];
    const { Q } = qrDecompose(A);
    const m = Q.length;
    const QT: number[][] = Array.from({ length: m }, (_, i) => Q.map((r) => r[i]));
    const I = matMul(QT, Q);
    for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) {
      expect(Math.abs(I[i][j] - (i === j ? 1 : 0))).toBeLessThan(1e-8);
    }
  });

  it('R is upper triangular', () => {
    const A = [[1, 2, 3], [4, 5, 6], [7, 8, 10]];
    const { R } = qrDecompose(A);
    for (let i = 0; i < R.length; i++)
      for (let j = 0; j < i && j < R[i].length; j++)
        expect(Math.abs(R[i][j])).toBeLessThan(1e-8);
  });

  it('rectangular tall matrix', () => {
    const A = [[1, 0], [0, 1], [1, 1]];
    const { Q, R } = qrDecompose(A);
    expect(approxEq(matMul(Q, R), A, 1e-8)).toBe(true);
  });

  it('identity in => identity out', () => {
    const I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const { Q, R } = qrDecompose(I3);
    expect(approxEq(matMul(Q, R), I3, 1e-8)).toBe(true);
  });

  it('rejects empty', () => {
    expect(() => qrDecompose([])).toThrow();
  });

  it('rejects jagged', () => {
    expect(() => qrDecompose([[1, 2], [3]])).toThrow();
  });

  it('rejects rows < cols', () => {
    expect(() => qrDecompose([[1, 2, 3]])).toThrow();
  });

  it('1x1 trivial', () => {
    const { Q, R } = qrDecompose([[5]]);
    expect(approxEq(matMul(Q, R), [[5]], 1e-12)).toBe(true);
  });

  it('handles negative pivot', () => {
    const A = [[-3, 1], [4, 2]];
    const { Q, R } = qrDecompose(A);
    expect(approxEq(matMul(Q, R), A, 1e-8)).toBe(true);
  });
});
