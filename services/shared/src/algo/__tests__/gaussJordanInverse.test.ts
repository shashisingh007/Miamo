import { describe, it, expect } from 'vitest';
import { gaussJordanInverse } from '../gaussJordanInverse';

function matmul(A: number[][], B: number[][]): number[][] {
  const m = A.length, k = A[0].length, n = B[0].length;
  const C: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) {
    let s = 0; for (let p = 0; p < k; p++) s += A[i][p] * B[p][j];
    C[i][j] = s;
  }
  return C;
}

describe('gaussJordanInverse', () => {
  it('throws on empty', () => {
    expect(() => gaussJordanInverse([])).toThrow();
  });

  it('throws on non-square', () => {
    expect(() => gaussJordanInverse([[1, 2]])).toThrow();
  });

  it('throws on singular', () => {
    expect(() => gaussJordanInverse([[1, 2], [2, 4]])).toThrow();
  });

  it('1x1 inverse', () => {
    expect(gaussJordanInverse([[5]])[0][0]).toBeCloseTo(0.2, 12);
  });

  it('2x2 inverse', () => {
    const A = [[4, 7], [2, 6]];
    const Ainv = gaussJordanInverse(A);
    const I = matmul(A, Ainv);
    expect(I[0][0]).toBeCloseTo(1, 10);
    expect(I[0][1]).toBeCloseTo(0, 10);
    expect(I[1][0]).toBeCloseTo(0, 10);
    expect(I[1][1]).toBeCloseTo(1, 10);
  });

  it('3x3 inverse', () => {
    const A = [
      [1, 2, 3],
      [0, 1, 4],
      [5, 6, 0],
    ];
    const Ainv = gaussJordanInverse(A);
    const I = matmul(A, Ainv);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      expect(I[i][j]).toBeCloseTo(i === j ? 1 : 0, 8);
    }
  });

  it('inverse of identity is identity', () => {
    const I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const Inv = gaussJordanInverse(I3);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      expect(Inv[i][j]).toBe(i === j ? 1 : 0);
    }
  });

  it('inverse of diagonal', () => {
    const D = [[2, 0, 0], [0, 4, 0], [0, 0, 5]];
    const Dinv = gaussJordanInverse(D);
    expect(Dinv[0][0]).toBeCloseTo(0.5, 12);
    expect(Dinv[1][1]).toBeCloseTo(0.25, 12);
    expect(Dinv[2][2]).toBeCloseTo(0.2, 12);
  });

  it('does not mutate input', () => {
    const A = [[1, 2], [3, 5]];
    const ref = JSON.parse(JSON.stringify(A));
    gaussJordanInverse(A);
    expect(A).toEqual(ref);
  });

  it('handles negative entries', () => {
    const A = [[-1, 2], [3, -4]];
    const Ainv = gaussJordanInverse(A);
    const I = matmul(A, Ainv);
    expect(I[0][0]).toBeCloseTo(1, 10);
    expect(I[1][1]).toBeCloseTo(1, 10);
  });

  it('partial pivot needed (zero pivot first row)', () => {
    const A = [
      [0, 1, 2],
      [1, 0, 1],
      [2, 1, 0],
    ];
    const Ainv = gaussJordanInverse(A);
    const I = matmul(A, Ainv);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      expect(I[i][j]).toBeCloseTo(i === j ? 1 : 0, 8);
    }
  });

  it('inverse of inverse is original', () => {
    const A = [[2, 1], [1, 3]];
    const Ainv = gaussJordanInverse(A);
    const Aii = gaussJordanInverse(Ainv);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      expect(Aii[i][j]).toBeCloseTo(A[i][j], 8);
    }
  });

  it('larger 4x4', () => {
    const A = [
      [4, 1, 0, 0],
      [1, 4, 1, 0],
      [0, 1, 4, 1],
      [0, 0, 1, 4],
    ];
    const Ainv = gaussJordanInverse(A);
    const I = matmul(A, Ainv);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      expect(I[i][j]).toBeCloseTo(i === j ? 1 : 0, 8);
    }
  });

  it('symmetric matrix', () => {
    const A = [
      [2, 1, 0],
      [1, 2, 1],
      [0, 1, 2],
    ];
    const Ainv = gaussJordanInverse(A);
    // for symmetric, Ainv is symmetric
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      expect(Ainv[i][j]).toBeCloseTo(Ainv[j][i], 10);
    }
  });
});
