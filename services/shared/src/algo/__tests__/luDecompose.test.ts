import { describe, it, expect } from 'vitest';
import { luDecompose, luSolve } from '../luDecompose';

function matMul(A: number[][], B: number[][]): number[][] {
  const n = A.length;
  const out: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < n; k++) {
      const a = A[i][k];
      for (let j = 0; j < n; j++) out[i][j] += a * B[k][j];
    }
  }
  return out;
}

function permute(A: number[][], P: number[]): number[][] {
  const n = A.length;
  const out: number[][] = new Array(n);
  for (let i = 0; i < n; i++) out[i] = A[P[i]].slice();
  return out;
}

describe('luDecompose', () => {
  it('empty matrix', () => {
    const d = luDecompose([]);
    expect(d.L).toEqual([]);
    expect(d.U).toEqual([]);
    expect(d.P).toEqual([]);
  });

  it('decomposes 1x1', () => {
    const d = luDecompose([[5]]);
    expect(d.L).toEqual([[1]]);
    expect(d.U).toEqual([[5]]);
  });

  it('reconstructs PA = LU on 3x3', () => {
    const A = [
      [2, -1, -2],
      [-4, 6, 3],
      [-4, -2, 8],
    ];
    const d = luDecompose(A);
    const PA = permute(A, d.P);
    const LU = matMul(d.L, d.U);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) expect(LU[i][j]).toBeCloseTo(PA[i][j], 9);
    }
  });

  it('L is unit lower triangular', () => {
    const A = [
      [4, 3, 2],
      [3, 5, 1],
      [2, 1, 6],
    ];
    const d = luDecompose(A);
    for (let i = 0; i < 3; i++) {
      expect(d.L[i][i]).toBeCloseTo(1, 12);
      for (let j = i + 1; j < 3; j++) expect(d.L[i][j]).toBeCloseTo(0, 12);
    }
  });

  it('U is upper triangular', () => {
    const A = [
      [4, 3, 2],
      [3, 5, 1],
      [2, 1, 6],
    ];
    const d = luDecompose(A);
    for (let i = 1; i < 3; i++) {
      for (let j = 0; j < i; j++) expect(d.U[i][j]).toBeCloseTo(0, 12);
    }
  });

  it('rejects non-square', () => {
    expect(() => luDecompose([[1, 2]])).toThrow();
  });

  it('rejects singular matrix', () => {
    expect(() =>
      luDecompose([
        [1, 2],
        [2, 4],
      ])
    ).toThrow();
  });

  it('luSolve solves a 3x3 system', () => {
    const A = [
      [3, 1, 2],
      [1, 5, 3],
      [4, 2, 7],
    ];
    const b = [10, 24, 31];
    const d = luDecompose(A);
    const x = luSolve(d, b);
    for (let i = 0; i < 3; i++) {
      let s = 0;
      for (let j = 0; j < 3; j++) s += A[i][j] * x[j];
      expect(s).toBeCloseTo(b[i], 9);
    }
  });

  it('luSolve handles permutation correctly when pivoting required', () => {
    const A = [
      [0, 1],
      [1, 0],
    ];
    const d = luDecompose(A);
    const x = luSolve(d, [3, 7]);
    expect(x[0]).toBeCloseTo(7, 12);
    expect(x[1]).toBeCloseTo(3, 12);
  });

  it('signum reflects an odd number of swaps', () => {
    const d = luDecompose([
      [0, 1],
      [1, 0],
    ]);
    expect(d.signum).toBe(-1);
  });
});
