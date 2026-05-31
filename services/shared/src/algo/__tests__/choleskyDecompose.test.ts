import { describe, it, expect } from 'vitest';
import { choleskyDecompose, choleskySolve } from '../choleskyDecompose';

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

function transpose(A: number[][]): number[][] {
  const n = A.length;
  const out: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) out[j][i] = A[i][j];
  return out;
}

describe('choleskyDecompose', () => {
  it('empty matrix', () => {
    expect(choleskyDecompose([])).toEqual([]);
  });

  it('decomposes 1x1 SPD', () => {
    expect(choleskyDecompose([[9]])).toEqual([[3]]);
  });

  it('reconstructs A = L L^T on 3x3 SPD', () => {
    const A = [
      [4, 12, -16],
      [12, 37, -43],
      [-16, -43, 98],
    ];
    const L = choleskyDecompose(A);
    const recon = matMul(L, transpose(L));
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) expect(recon[i][j]).toBeCloseTo(A[i][j], 9);
    }
  });

  it('L is lower triangular', () => {
    const A = [
      [4, 1],
      [1, 5],
    ];
    const L = choleskyDecompose(A);
    expect(L[0][1]).toBe(0);
  });

  it('rejects non-SPD with negative diagonal', () => {
    expect(() => choleskyDecompose([[-1]])).toThrow();
  });

  it('rejects non-SPD when partial sum non-positive', () => {
    expect(() =>
      choleskyDecompose([
        [1, 2],
        [2, 1],
      ])
    ).toThrow();
  });

  it('rejects non-square matrix', () => {
    expect(() => choleskyDecompose([[1, 0]])).toThrow();
  });

  it('solves SPD 2x2 system', () => {
    const A = [
      [4, 1],
      [1, 3],
    ];
    const b = [1, 2];
    const L = choleskyDecompose(A);
    const x = choleskySolve(L, b);
    expect(A[0][0] * x[0] + A[0][1] * x[1]).toBeCloseTo(b[0], 9);
    expect(A[1][0] * x[0] + A[1][1] * x[1]).toBeCloseTo(b[1], 9);
  });

  it('solves SPD 3x3 system', () => {
    const A = [
      [25, 15, -5],
      [15, 18, 0],
      [-5, 0, 11],
    ];
    const b = [1, 2, 3];
    const L = choleskyDecompose(A);
    const x = choleskySolve(L, b);
    for (let i = 0; i < 3; i++) {
      let s = 0;
      for (let j = 0; j < 3; j++) s += A[i][j] * x[j];
      expect(s).toBeCloseTo(b[i], 9);
    }
  });

  it('rejects choleskySolve on length mismatch', () => {
    const L = choleskyDecompose([
      [4, 1],
      [1, 3],
    ]);
    expect(() => choleskySolve(L, [1])).toThrow();
  });

  it('identity matrix gives identity L', () => {
    const A = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
    const L = choleskyDecompose(A);
    expect(L).toEqual(A);
  });
});
