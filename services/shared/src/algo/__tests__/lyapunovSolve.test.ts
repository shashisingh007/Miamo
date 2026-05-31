import { describe, it, expect } from 'vitest';
import { lyapunovSolve } from '../lyapunovSolve';

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
  const n = M.length;
  const T: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = new Array(n);
    for (let j = 0; j < n; j++) row[j] = M[j][i];
    T.push(row);
  }
  return T;
}

function residual(A: number[][], X: number[][], Q: number[][]): number {
  const lhs = matMul(A, X);
  const r = matMul(X, transpose(A));
  let s = 0;
  for (let i = 0; i < A.length; i++) for (let j = 0; j < A.length; j++) {
    const d = lhs[i][j] + r[i][j] + Q[i][j];
    s = Math.max(s, Math.abs(d));
  }
  return s;
}

describe('lyapunovSolve', () => {
  it('throws on empty', () => {
    expect(() => lyapunovSolve([], [])).toThrow();
  });

  it('throws on non-square A', () => {
    expect(() => lyapunovSolve([[1, 2]], [[1]])).toThrow();
  });

  it('throws on Q dim mismatch', () => {
    expect(() => lyapunovSolve([[1]], [[1, 2], [3, 4]])).toThrow();
  });

  it('1x1 case', () => {
    // 2*a*x = -q => x = -q/(2a)
    const X = lyapunovSolve([[2]], [[8]]);
    expect(X[0][0]).toBeCloseTo(-2, 8);
  });

  it('diagonal stable', () => {
    const A = [[-1, 0], [0, -2]];
    const Q = [[2, 0], [0, 4]];
    const X = lyapunovSolve(A, Q);
    expect(X[0][0]).toBeCloseTo(1, 8);
    expect(X[1][1]).toBeCloseTo(1, 8);
  });

  it('residual small (2x2 stable)', () => {
    const A = [[-2, 1], [0, -3]];
    const Q = [[1, 0], [0, 1]];
    const X = lyapunovSolve(A, Q);
    expect(residual(A, X, Q)).toBeLessThan(1e-8);
  });

  it('residual small (3x3 stable)', () => {
    const A = [[-3, 1, 0], [0, -4, 1], [0, 0, -5]];
    const Q = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const X = lyapunovSolve(A, Q);
    expect(residual(A, X, Q)).toBeLessThan(1e-7);
  });

  it('zero Q => zero X', () => {
    const X = lyapunovSolve([[-1, 0], [0, -2]], [[0, 0], [0, 0]]);
    for (const row of X) for (const v of row) expect(Math.abs(v)).toBeLessThan(1e-10);
  });

  it('output dims n x n', () => {
    const X = lyapunovSolve([[-1, 0], [0, -2]], [[1, 0], [0, 1]]);
    expect(X).toHaveLength(2);
    expect(X[0]).toHaveLength(2);
  });

  it('linearity in Q', () => {
    const A = [[-2, 1], [0, -3]];
    const Q1 = [[1, 0], [0, 1]];
    const Q2 = [[2, 0], [0, 2]];
    const X1 = lyapunovSolve(A, Q1);
    const X2 = lyapunovSolve(A, Q2);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      expect(X2[i][j]).toBeCloseTo(2 * X1[i][j], 8);
    }
  });

  it('does not mutate inputs', () => {
    const A = [[-2, 1], [0, -3]];
    const Q = [[1, 0], [0, 1]];
    const Aref = JSON.parse(JSON.stringify(A));
    const Qref = JSON.parse(JSON.stringify(Q));
    lyapunovSolve(A, Q);
    expect(A).toEqual(Aref);
    expect(Q).toEqual(Qref);
  });

  it('symmetric Q yields symmetric-ish X', () => {
    const A = [[-2, 1], [0, -3]];
    const Q = [[2, 1], [1, 3]];
    const X = lyapunovSolve(A, Q);
    expect(X[0][1]).toBeCloseTo(X[1][0], 6);
  });

  it('throws when A and -A^T share eigenvalue', () => {
    // A=[[1]], -A^T=[[-1]] not equal so 1x1 1+1=2 fine. Use bigger:
    // A=[[0, 1],[-1, 0]] eigenvalues +/- i, A^T=[[0,-1],[1,0]] eigenvalues -/+ i
    // share => singular
    expect(() => lyapunovSolve([[0, 1], [-1, 0]], [[1, 0], [0, 1]])).toThrow();
  });

  it('signs consistent', () => {
    // Stable A and positive definite Q => X should be positive definite (diag positive)
    const A = [[-1, 0], [0, -2]];
    const Q = [[2, 0], [0, 4]];
    const X = lyapunovSolve(A, Q);
    expect(X[0][0]).toBeGreaterThan(0);
    expect(X[1][1]).toBeGreaterThan(0);
  });

  it('4x4 stable', () => {
    const A = [
      [-2, 1, 0, 0],
      [0, -3, 1, 0],
      [0, 0, -4, 1],
      [0, 0, 0, -5],
    ];
    const Q: number[][] = [];
    for (let i = 0; i < 4; i++) {
      const row = new Array(4).fill(0);
      row[i] = 1;
      Q.push(row);
    }
    const X = lyapunovSolve(A, Q);
    expect(residual(A, X, Q)).toBeLessThan(1e-6);
  });
});
