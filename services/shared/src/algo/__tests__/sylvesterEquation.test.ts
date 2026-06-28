import { describe, it, expect } from 'vitest';
import { sylvesterEquation } from '../sylvesterEquation';

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

function add(A: number[][], B: number[][]): number[][] {
  const m = A.length, n = A[0].length;
  const C: number[][] = [];
  for (let i = 0; i < m; i++) {
    const row = new Array(n);
    for (let j = 0; j < n; j++) row[j] = A[i][j] + B[i][j];
    C.push(row);
  }
  return C;
}

function residual(A: number[][], B: number[][], X: number[][], C: number[][]): number {
  const lhs = add(matMul(A, X), matMul(X, B));
  let s = 0;
  for (let i = 0; i < C.length; i++) for (let j = 0; j < C[0].length; j++) {
    const d = lhs[i][j] - C[i][j];
    s = Math.max(s, Math.abs(d));
  }
  return s;
}

describe('sylvesterEquation', () => {
  it('throws on empty A', () => {
    expect(() => sylvesterEquation([], [[1]], [[1]])).toThrow();
  });

  it('throws on empty B', () => {
    expect(() => sylvesterEquation([[1]], [], [[1]])).toThrow();
  });

  it('throws on non-square A', () => {
    expect(() => sylvesterEquation([[1, 2]], [[1]], [[1, 2]])).toThrow();
  });

  it('throws on non-square B', () => {
    expect(() => sylvesterEquation([[1]], [[1, 2]], [[1]])).toThrow();
  });

  it('throws on bad C dims', () => {
    expect(() => sylvesterEquation([[1]], [[1]], [[1, 2]])).toThrow();
  });

  it('throws on singular (A and -B share eigenvalue)', () => {
    // A=[[1]], B=[[-1]] => A*X + X*B = X - X = 0; any C != 0 is unsolvable
    expect(() => sylvesterEquation([[1]], [[-1]], [[1]])).toThrow();
  });

  it('1x1 case', () => {
    // a*x + x*b = c => x = c/(a+b)
    const X = sylvesterEquation([[2]], [[3]], [[10]]);
    expect(X[0][0]).toBeCloseTo(2, 10);
  });

  it('2x2 simple', () => {
    const A = [[1, 0], [0, 2]];
    const B = [[3, 0], [0, 4]];
    const C = [[1, 2], [3, 4]];
    const X = sylvesterEquation(A, B, C);
    expect(residual(A, B, X, C)).toBeLessThan(1e-8);
  });

  it('non-diagonal A,B', () => {
    const A = [[2, 1], [0, 3]];
    const B = [[1, 0], [1, 2]];
    const C = [[5, 3], [2, 4]];
    const X = sylvesterEquation(A, B, C);
    expect(residual(A, B, X, C)).toBeLessThan(1e-8);
  });

  it('zero C => zero X', () => {
    const X = sylvesterEquation([[2, 1], [0, 3]], [[1, 0], [1, 2]], [[0, 0], [0, 0]]);
    for (const row of X) for (const v of row) expect(Math.abs(v)).toBeLessThan(1e-10);
  });

  it('3x3 case', () => {
    const A = [[2, 0, 0], [1, 3, 0], [0, 1, 4]];
    const B = [[5, 1], [0, 6]];
    const C = [[1, 2], [3, 4], [5, 6]];
    const X = sylvesterEquation(A, B, C);
    expect(X).toHaveLength(3);
    expect(X[0]).toHaveLength(2);
    expect(residual(A, B, X, C)).toBeLessThan(1e-7);
  });

  it('returned dims match m x n', () => {
    const X = sylvesterEquation([[1, 0], [0, 2]], [[3]], [[1], [2]]);
    expect(X).toHaveLength(2);
    expect(X[0]).toHaveLength(1);
  });

  it('linearity in C', () => {
    const A = [[2, 0], [0, 3]];
    const B = [[5, 0], [0, 7]];
    const C1 = [[1, 2], [3, 4]];
    const C2 = [[2, 4], [6, 8]];
    const X1 = sylvesterEquation(A, B, C1);
    const X2 = sylvesterEquation(A, B, C2);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      expect(X2[i][j]).toBeCloseTo(2 * X1[i][j], 8);
    }
  });

  it('does not mutate inputs', () => {
    const A = [[2, 1], [0, 3]];
    const B = [[1, 0], [1, 2]];
    const C = [[5, 3], [2, 4]];
    const Aref = JSON.parse(JSON.stringify(A));
    const Bref = JSON.parse(JSON.stringify(B));
    const Cref = JSON.parse(JSON.stringify(C));
    sylvesterEquation(A, B, C);
    expect(A).toEqual(Aref);
    expect(B).toEqual(Bref);
    expect(C).toEqual(Cref);
  });

  it('Lyapunov-style A*X + X*A = -Q', () => {
    const A = [[-2, 0], [0, -3]];
    const Q = [[1, 0], [0, 1]];
    const negQ = [[-1, 0], [0, -1]];
    const X = sylvesterEquation(A, A, negQ);
    expect(residual(A, A, X, negQ)).toBeLessThan(1e-8);
    // Diagonal expected: x_ii = -q_ii / (2 a_ii) = 1/4 and 1/6
    expect(X[0][0]).toBeCloseTo(0.25, 8);
    expect(X[1][1]).toBeCloseTo(1 / 6, 8);
  });
});
