import { describe, it, expect } from 'vitest';
import { matrixSqrt } from '../matrixSqrt';

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

describe('matrixSqrt', () => {
  it('throws on empty', () => {
    expect(() => matrixSqrt([])).toThrow();
  });

  it('throws on non-square', () => {
    expect(() => matrixSqrt([[1, 2, 3], [4, 5, 6]])).toThrow();
  });

  it('1x1 positive', () => {
    const S = matrixSqrt([[9]]);
    expect(S[0][0]).toBeCloseTo(3, 8);
  });

  it('identity', () => {
    const S = matrixSqrt([[1, 0], [0, 1]]);
    expect(S[0][0]).toBeCloseTo(1, 8);
    expect(S[1][1]).toBeCloseTo(1, 8);
    expect(Math.abs(S[0][1])).toBeLessThan(1e-8);
    expect(Math.abs(S[1][0])).toBeLessThan(1e-8);
  });

  it('diagonal', () => {
    const S = matrixSqrt([[4, 0], [0, 9]]);
    expect(S[0][0]).toBeCloseTo(2, 6);
    expect(S[1][1]).toBeCloseTo(3, 6);
  });

  it('S*S = A (2x2 SPD)', () => {
    const A = [[5, 2], [2, 5]];
    const S = matrixSqrt(A);
    const SS = matMul(S, S);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      expect(SS[i][j]).toBeCloseTo(A[i][j], 6);
    }
  });

  it('S is symmetric for SPD input', () => {
    const A = [[5, 2], [2, 5]];
    const S = matrixSqrt(A);
    expect(S[0][1]).toBeCloseTo(S[1][0], 6);
  });

  it('3x3 SPD', () => {
    const A = [[4, 1, 0], [1, 5, 1], [0, 1, 3]];
    const S = matrixSqrt(A);
    const SS = matMul(S, S);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      expect(SS[i][j]).toBeCloseTo(A[i][j], 5);
    }
  });

  it('does not mutate input', () => {
    const A = [[5, 2], [2, 5]];
    const ref = JSON.parse(JSON.stringify(A));
    matrixSqrt(A);
    expect(A).toEqual(ref);
  });

  it('output dims match', () => {
    const S = matrixSqrt([[2, 0], [0, 3]]);
    expect(S).toHaveLength(2);
    expect(S[0]).toHaveLength(2);
  });

  it('scalar multiple sqrt', () => {
    const S = matrixSqrt([[16, 0], [0, 25]]);
    expect(S[0][0]).toBeCloseTo(4, 6);
    expect(S[1][1]).toBeCloseTo(5, 6);
  });

  it('non-symmetric diagonalizable', () => {
    // upper triangular with positive eigenvalues
    const A = [[4, 2], [0, 9]];
    const S = matrixSqrt(A);
    const SS = matMul(S, S);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      expect(SS[i][j]).toBeCloseTo(A[i][j], 5);
    }
  });

  it('tolerance respected (loose)', () => {
    const A = [[5, 2], [2, 5]];
    const S = matrixSqrt(A, { tol: 1e-3, maxIter: 50 });
    const SS = matMul(S, S);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      expect(SS[i][j]).toBeCloseTo(A[i][j], 2);
    }
  });

  it('larger SPD', () => {
    const A = [
      [9, 1, 0, 0],
      [1, 8, 1, 0],
      [0, 1, 7, 1],
      [0, 0, 1, 6],
    ];
    const S = matrixSqrt(A);
    const SS = matMul(S, S);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      expect(SS[i][j]).toBeCloseTo(A[i][j], 4);
    }
  });

  it('eigenvalues squared (diagonal)', () => {
    const S = matrixSqrt([[100, 0, 0], [0, 4, 0], [0, 0, 1]]);
    expect(S[0][0]).toBeCloseTo(10, 6);
    expect(S[1][1]).toBeCloseTo(2, 6);
    expect(S[2][2]).toBeCloseTo(1, 6);
  });
});
