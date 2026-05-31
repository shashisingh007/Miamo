import { describe, it, expect } from 'vitest';
import { strassenMultiply } from '../strassenMultiply';

function naive(A: number[][], B: number[][]): number[][] {
  const m = A.length;
  const n = B[0].length;
  const k = B.length;
  const C: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) for (let p = 0; p < k; p++) C[i][j] += A[i][p] * B[p][j];
  return C;
}

describe('strassenMultiply', () => {
  it('throws on empty', () => {
    expect(() => strassenMultiply([], [])).toThrow();
  });

  it('throws on uneven A', () => {
    expect(() => strassenMultiply([[1, 2], [3]], [[1], [2]])).toThrow();
  });

  it('throws on uneven B', () => {
    expect(() => strassenMultiply([[1, 2]], [[1, 2], [3]])).toThrow();
  });

  it('throws on dim mismatch', () => {
    expect(() => strassenMultiply([[1, 2]], [[1], [2], [3]])).toThrow();
  });

  it('1x1', () => {
    expect(strassenMultiply([[3]], [[4]])).toEqual([[12]]);
  });

  it('2x2', () => {
    const A = [
      [1, 2],
      [3, 4],
    ];
    const B = [
      [5, 6],
      [7, 8],
    ];
    expect(strassenMultiply(A, B)).toEqual(naive(A, B));
  });

  it('3x3 (padded)', () => {
    const A = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ];
    const B = [
      [9, 8, 7],
      [6, 5, 4],
      [3, 2, 1],
    ];
    expect(strassenMultiply(A, B)).toEqual(naive(A, B));
  });

  it('rectangular MxN * NxK', () => {
    const A = [
      [1, 2, 3],
      [4, 5, 6],
    ];
    const B = [
      [7, 8],
      [9, 10],
      [11, 12],
    ];
    expect(strassenMultiply(A, B)).toEqual(naive(A, B));
  });

  it('identity is unit', () => {
    const I = [
      [1, 0],
      [0, 1],
    ];
    const M = [
      [3, 5],
      [-1, 2],
    ];
    expect(strassenMultiply(I, M)).toEqual(M);
    expect(strassenMultiply(M, I)).toEqual(M);
  });

  it('zero matrix', () => {
    const Z = [
      [0, 0],
      [0, 0],
    ];
    const M = [
      [1, 2],
      [3, 4],
    ];
    expect(strassenMultiply(Z, M)).toEqual(Z);
  });

  it('larger 8x8', () => {
    const n = 8;
    const A: number[][] = [];
    const B: number[][] = [];
    for (let i = 0; i < n; i++) {
      const ra: number[] = [];
      const rb: number[] = [];
      for (let j = 0; j < n; j++) {
        ra.push((i + j) % 7);
        rb.push((i * j) % 5);
      }
      A.push(ra);
      B.push(rb);
    }
    expect(strassenMultiply(A, B)).toEqual(naive(A, B));
  });

  it('larger 70x70 (uses Strassen split)', () => {
    const n = 70;
    const A: number[][] = [];
    const B: number[][] = [];
    for (let i = 0; i < n; i++) {
      const ra: number[] = [];
      const rb: number[] = [];
      for (let j = 0; j < n; j++) {
        ra.push(((i + 1) * (j + 2)) % 11);
        rb.push(((i + 3) * (j + 5)) % 13);
      }
      A.push(ra);
      B.push(rb);
    }
    const C = strassenMultiply(A, B);
    const D = naive(A, B);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) expect(C[i][j]).toBe(D[i][j]);
  });

  it('non-square A 3x4 * 4x2', () => {
    const A = [
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 10, 11, 12],
    ];
    const B = [
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
    ];
    expect(strassenMultiply(A, B)).toEqual(naive(A, B));
  });

  it('output dimensions correct', () => {
    const C = strassenMultiply([[1, 2, 3]], [[1], [2], [3]]);
    expect(C).toEqual([[14]]);
  });

  it('handles negatives', () => {
    const A = [
      [-1, 2],
      [3, -4],
    ];
    const B = [
      [5, -6],
      [-7, 8],
    ];
    expect(strassenMultiply(A, B)).toEqual(naive(A, B));
  });
});
