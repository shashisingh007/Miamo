import { describe, it, expect } from 'vitest';
import { modifiedGramSchmidt } from '../modifiedGramSchmidt';

function matmul(A: number[][], B: number[][]): number[][] {
  const m = A.length, k = A[0].length, n = B[0].length;
  const C: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) {
    let s = 0; for (let p = 0; p < k; p++) s += A[i][p] * B[p][j];
    C[i][j] = s;
  }
  return C;
}
function transpose(A: number[][]): number[][] {
  return A[0].map((_, j) => A.map((r) => r[j]));
}

describe('modifiedGramSchmidt', () => {
  it('throws on empty', () => {
    expect(() => modifiedGramSchmidt([])).toThrow();
  });

  it('throws on ragged', () => {
    expect(() => modifiedGramSchmidt([[1, 2], [3]] as any)).toThrow();
  });

  it('orthonormal Q for full rank', () => {
    const A = [[1, 1], [1, 0], [0, 1]];
    const { Q } = modifiedGramSchmidt(A);
    const QtQ = matmul(transpose(Q), Q);
    for (let i = 0; i < QtQ.length; i++) for (let j = 0; j < QtQ.length; j++) {
      expect(Math.abs(QtQ[i][j] - (i === j ? 1 : 0))).toBeLessThan(1e-9);
    }
  });

  it('A = Q R for full rank', () => {
    const A = [[1, 1], [1, 0], [0, 1]];
    const { Q, R } = modifiedGramSchmidt(A);
    const recon = matmul(Q, R);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      expect(Math.abs(recon[i][j] - A[i][j])).toBeLessThan(1e-9);
    }
  });

  it('rank=2 for full-rank 3x2', () => {
    const A = [[1, 1], [1, 0], [0, 1]];
    expect(modifiedGramSchmidt(A).rank).toBe(2);
  });

  it('rank-deficient detected', () => {
    const A = [[1, 2], [2, 4], [3, 6]];
    expect(modifiedGramSchmidt(A).rank).toBe(1);
  });

  it('A = Q R for rank-deficient', () => {
    const A = [[1, 2], [2, 4], [3, 6]];
    const { Q, R } = modifiedGramSchmidt(A);
    const recon = matmul(Q, R);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      expect(Math.abs(recon[i][j] - A[i][j])).toBeLessThan(1e-9);
    }
  });

  it('square identity', () => {
    const A = [[1, 0], [0, 1]];
    const { Q, R, rank } = modifiedGramSchmidt(A);
    expect(rank).toBe(2);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      expect(Math.abs(Q[i][j] - A[i][j])).toBeLessThan(1e-12);
      expect(Math.abs(R[i][j] - A[i][j])).toBeLessThan(1e-12);
    }
  });

  it('Q dims m x k', () => {
    const A = [[1, 2, 3], [4, 5, 6]];
    const { Q, rank } = modifiedGramSchmidt(A);
    expect(Q.length).toBe(2);
    expect(Q[0].length).toBe(rank);
  });

  it('R dims k x n', () => {
    const A = [[1, 2, 3], [4, 5, 6]];
    const { R, rank } = modifiedGramSchmidt(A);
    expect(R.length).toBe(rank);
    expect(R[0].length).toBe(3);
  });

  it('does not mutate input', () => {
    const A = [[1, 2], [3, 4]];
    const ref = JSON.parse(JSON.stringify(A));
    modifiedGramSchmidt(A);
    expect(A).toEqual(ref);
  });

  it('1-column matrix', () => {
    const A = [[3], [4]];
    const { Q, R, rank } = modifiedGramSchmidt(A);
    expect(rank).toBe(1);
    expect(Q[0][0]).toBeCloseTo(0.6, 10);
    expect(Q[1][0]).toBeCloseTo(0.8, 10);
    expect(R[0][0]).toBeCloseTo(5, 10);
  });

  it('zero column gives lower rank', () => {
    const A = [[1, 0], [0, 0], [0, 0]];
    expect(modifiedGramSchmidt(A).rank).toBe(1);
  });

  it('R upper triangular for full rank square', () => {
    const A = [[2, 1], [1, 3]];
    const { R } = modifiedGramSchmidt(A);
    expect(Math.abs(R[1][0])).toBeLessThan(1e-12);
  });
});
