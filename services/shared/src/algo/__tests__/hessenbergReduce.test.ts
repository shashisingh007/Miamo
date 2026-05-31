import { describe, it, expect } from 'vitest';
import { hessenbergReduce } from '../hessenbergReduce';

function matmul(A: number[][], B: number[][]): number[][] {
  const m = A.length;
  const k = A[0].length;
  const n = B[0].length;
  const C: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) {
    let s = 0;
    for (let p = 0; p < k; p++) s += A[i][p] * B[p][j];
    C[i][j] = s;
  }
  return C;
}

function transpose(A: number[][]): number[][] {
  return A[0].map((_, j) => A.map((r) => r[j]));
}

describe('hessenbergReduce', () => {
  it('throws on empty', () => {
    expect(() => hessenbergReduce([])).toThrow();
  });

  it('throws on non-square', () => {
    expect(() => hessenbergReduce([[1, 2]])).toThrow();
  });

  it('1x1 unchanged', () => {
    const { H } = hessenbergReduce([[5]]);
    expect(H[0][0]).toBe(5);
  });

  it('2x2 unchanged structure', () => {
    const A = [[1, 2], [3, 4]];
    const { H } = hessenbergReduce(A);
    expect(H[0][0]).toBe(1);
  });

  it('3x3 lower elements zero', () => {
    const A = [
      [4, 1, -2],
      [1, 2, 0],
      [-2, 0, 3],
    ];
    const { H } = hessenbergReduce(A);
    expect(Math.abs(H[2][0])).toBeLessThan(1e-10);
  });

  it('4x4 sub-subdiagonal zero', () => {
    const A = [
      [1, 2, 3, 4],
      [4, 5, 6, 7],
      [7, 8, 9, 10],
      [1, 0, 1, 2],
    ];
    const { H } = hessenbergReduce(A);
    expect(Math.abs(H[2][0])).toBeLessThan(1e-9);
    expect(Math.abs(H[3][0])).toBeLessThan(1e-9);
    expect(Math.abs(H[3][1])).toBeLessThan(1e-9);
  });

  it('Q orthogonal', () => {
    const A = [
      [4, 1, -2, 2],
      [1, 2, 0, 1],
      [-2, 0, 3, -2],
      [2, 1, -2, -1],
    ];
    const { Q } = hessenbergReduce(A);
    const QtQ = matmul(transpose(Q), Q);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      expect(Math.abs(QtQ[i][j] - (i === j ? 1 : 0))).toBeLessThan(1e-9);
    }
  });

  it('Q^T A Q = H', () => {
    const A = [
      [4, 1, -2, 2],
      [1, 2, 0, 1],
      [-2, 0, 3, -2],
      [2, 1, -2, -1],
    ];
    const { H, Q } = hessenbergReduce(A);
    const recon = matmul(matmul(transpose(Q), A), Q);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      expect(Math.abs(recon[i][j] - H[i][j])).toBeLessThan(1e-9);
    }
  });

  it('preserves trace', () => {
    const A = [
      [4, 1, -2],
      [1, 2, 0],
      [-2, 0, 3],
    ];
    const { H } = hessenbergReduce(A);
    const tA = A[0][0] + A[1][1] + A[2][2];
    const tH = H[0][0] + H[1][1] + H[2][2];
    expect(Math.abs(tA - tH)).toBeLessThan(1e-9);
  });

  it('symmetric => tridiagonal', () => {
    const A = [
      [4, 1, -2, 2],
      [1, 2, 0, 1],
      [-2, 0, 3, -2],
      [2, 1, -2, -1],
    ];
    const { H } = hessenbergReduce(A);
    expect(Math.abs(H[0][2])).toBeLessThan(1e-9);
    expect(Math.abs(H[0][3])).toBeLessThan(1e-9);
    expect(Math.abs(H[1][3])).toBeLessThan(1e-9);
  });

  it('already hessenberg keeps subdiagonal zero', () => {
    const A = [
      [1, 2, 3],
      [4, 5, 6],
      [0, 7, 8],
    ];
    const { H } = hessenbergReduce(A);
    expect(Math.abs(H[2][0])).toBeLessThan(1e-9);
  });

  it('5x5 hessenberg form', () => {
    const A = [
      [1, 2, 3, 4, 5],
      [2, 3, 4, 5, 6],
      [3, 4, 5, 6, 7],
      [4, 5, 6, 7, 8],
      [5, 6, 7, 8, 1],
    ];
    const { H } = hessenbergReduce(A);
    for (let i = 2; i < 5; i++) for (let j = 0; j < i - 1; j++) {
      expect(Math.abs(H[i][j])).toBeLessThan(1e-8);
    }
  });

  it('does not mutate input', () => {
    const A = [[2, 1], [1, 2]];
    const ref = JSON.parse(JSON.stringify(A));
    hessenbergReduce(A);
    expect(A).toEqual(ref);
  });
});
