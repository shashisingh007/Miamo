import { describe, it, expect } from 'vitest';
import { polarDecompose } from '../polarDecompose';

function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length, k = A[0].length, n = B[0].length;
  const C: number[][] = [];
  for (let i = 0; i < m; i++) {
    const row = new Array(n).fill(0);
    for (let p = 0; p < k; p++) for (let j = 0; j < n; j++) row[j] += A[i][p] * B[p][j];
    C.push(row);
  }
  return C;
}

function transpose(M: number[][]): number[][] {
  const r = M.length, c = M[0].length;
  const T: number[][] = [];
  for (let i = 0; i < c; i++) {
    const row = new Array(r);
    for (let j = 0; j < r; j++) row[j] = M[j][i];
    T.push(row);
  }
  return T;
}

function isOrthogonal(U: number[][], tol = 1e-8): boolean {
  const UTU = matMul(transpose(U), U);
  for (let i = 0; i < U.length; i++) for (let j = 0; j < U.length; j++) {
    const expected = i === j ? 1 : 0;
    if (Math.abs(UTU[i][j] - expected) > tol) return false;
  }
  return true;
}

function isSymmetric(P: number[][], tol = 1e-8): boolean {
  for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
    if (Math.abs(P[i][j] - P[j][i]) > tol) return false;
  }
  return true;
}

describe('polarDecompose', () => {
  it('throws on empty', () => {
    expect(() => polarDecompose([])).toThrow();
  });

  it('throws on non-square', () => {
    expect(() => polarDecompose([[1, 2, 3], [4, 5, 6]])).toThrow();
  });

  it('throws on singular', () => {
    expect(() => polarDecompose([[1, 2], [2, 4]])).toThrow();
  });

  it('1x1 positive', () => {
    const { U, P } = polarDecompose([[5]]);
    expect(U[0][0]).toBeCloseTo(1, 8);
    expect(P[0][0]).toBeCloseTo(5, 8);
  });

  it('1x1 negative', () => {
    const { U, P } = polarDecompose([[-7]]);
    expect(U[0][0]).toBeCloseTo(-1, 8);
    expect(P[0][0]).toBeCloseTo(7, 8);
  });

  it('identity', () => {
    const I = [[1, 0], [0, 1]];
    const { U, P } = polarDecompose(I);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      expect(U[i][j]).toBeCloseTo(I[i][j], 6);
      expect(P[i][j]).toBeCloseTo(I[i][j], 6);
    }
  });

  it('rotation matrix => U=A, P=I', () => {
    const a = Math.PI / 5;
    const R = [[Math.cos(a), -Math.sin(a)], [Math.sin(a), Math.cos(a)]];
    const { U, P } = polarDecompose(R);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      expect(U[i][j]).toBeCloseTo(R[i][j], 6);
      expect(P[i][j]).toBeCloseTo(i === j ? 1 : 0, 6);
    }
  });

  it('U is orthogonal', () => {
    const A = [[2, 1], [1, 3]];
    const { U } = polarDecompose(A);
    expect(isOrthogonal(U)).toBe(true);
  });

  it('P is symmetric', () => {
    const A = [[2, 1], [1, 3]];
    const { P } = polarDecompose(A);
    expect(isSymmetric(P)).toBe(true);
  });

  it('A = U*P reconstructs', () => {
    const A = [[2, 1], [0, 3]];
    const { U, P } = polarDecompose(A);
    const UP = matMul(U, P);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      expect(UP[i][j]).toBeCloseTo(A[i][j], 6);
    }
  });

  it('symmetric positive => U=I, P=A', () => {
    const A = [[3, 1], [1, 2]];
    const { U, P } = polarDecompose(A);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      expect(U[i][j]).toBeCloseTo(i === j ? 1 : 0, 6);
      expect(P[i][j]).toBeCloseTo(A[i][j], 6);
    }
  });

  it('3x3 reconstructs', () => {
    const A = [[1, 2, 0], [0, 1, 1], [1, 0, 2]];
    const { U, P } = polarDecompose(A);
    const UP = matMul(U, P);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      expect(UP[i][j]).toBeCloseTo(A[i][j], 5);
    }
  });

  it('3x3 orthogonal U', () => {
    const A = [[1, 2, 0], [0, 1, 1], [1, 0, 2]];
    const { U } = polarDecompose(A);
    expect(isOrthogonal(U, 1e-6)).toBe(true);
  });

  it('P positive semidefinite (diagonal >= 0)', () => {
    const A = [[1, 2, 0], [0, 1, 1], [1, 0, 2]];
    const { P } = polarDecompose(A);
    for (let i = 0; i < 3; i++) expect(P[i][i]).toBeGreaterThan(-1e-8);
  });

  it('reflection matrix', () => {
    const A = [[1, 0], [0, -1]];
    const { U, P } = polarDecompose(A);
    expect(isOrthogonal(U)).toBe(true);
    const UP = matMul(U, P);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      expect(UP[i][j]).toBeCloseTo(A[i][j], 6);
    }
  });
});
