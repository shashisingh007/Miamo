import { describe, it, expect } from 'vitest';
import { ldltDecompose, ldltSolve } from '../ldltDecompose';

function reconstruct(L: number[][], D: number[]): number[][] {
  const n = L.length;
  const out: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let s = 0;
      for (let k = 0; k < n; k++) s += L[i][k] * D[k] * L[j][k];
      out[i][j] = s;
    }
  }
  return out;
}

describe('ldltDecompose', () => {
  it('throws on empty', () => {
    expect(() => ldltDecompose([])).toThrow();
  });

  it('throws on non-square', () => {
    expect(() => ldltDecompose([[1, 2]])).toThrow();
  });

  it('throws on non-symmetric', () => {
    expect(() => ldltDecompose([[1, 2], [3, 4]])).toThrow();
  });

  it('throws on zero pivot', () => {
    expect(() => ldltDecompose([[0, 0], [0, 1]])).toThrow();
  });

  it('1x1', () => {
    const r = ldltDecompose([[5]]);
    expect(r.D).toEqual([5]);
    expect(r.L).toEqual([[1]]);
  });

  it('2x2 SPD', () => {
    const A = [
      [4, 2],
      [2, 3],
    ];
    const { L, D } = ldltDecompose(A);
    const R = reconstruct(L, D);
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) expect(R[i][j]).toBeCloseTo(A[i][j], 8);
  });

  it('3x3 SPD', () => {
    const A = [
      [4, 2, 1],
      [2, 5, 2],
      [1, 2, 6],
    ];
    const { L, D } = ldltDecompose(A);
    const R = reconstruct(L, D);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) expect(R[i][j]).toBeCloseTo(A[i][j], 8);
  });

  it('indefinite symmetric', () => {
    const A = [
      [2, 1],
      [1, -3],
    ];
    const { L, D } = ldltDecompose(A);
    const R = reconstruct(L, D);
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) expect(R[i][j]).toBeCloseTo(A[i][j], 8);
  });

  it('L is unit lower triangular', () => {
    const A = [
      [4, 2],
      [2, 3],
    ];
    const { L } = ldltDecompose(A);
    expect(L[0][0]).toBe(1);
    expect(L[1][1]).toBe(1);
    expect(L[0][1]).toBe(0);
  });

  it('solve 2x2', () => {
    const A = [
      [4, 2],
      [2, 3],
    ];
    const { L, D } = ldltDecompose(A);
    const x = ldltSolve(L, D, [10, 11]);
    for (let i = 0; i < 2; i++) {
      let s = 0;
      for (let j = 0; j < 2; j++) s += A[i][j] * x[j];
      expect(s).toBeCloseTo(i === 0 ? 10 : 11, 8);
    }
  });

  it('solve 3x3', () => {
    const A = [
      [4, 2, 1],
      [2, 5, 2],
      [1, 2, 6],
    ];
    const b = [7, 9, 9];
    const { L, D } = ldltDecompose(A);
    const x = ldltSolve(L, D, b);
    for (let i = 0; i < 3; i++) {
      let s = 0;
      for (let j = 0; j < 3; j++) s += A[i][j] * x[j];
      expect(s).toBeCloseTo(b[i], 8);
    }
  });

  it('solve size mismatch throws', () => {
    expect(() => ldltSolve([[1]], [1, 2], [1])).toThrow();
    expect(() => ldltSolve([[1]], [1], [1, 2])).toThrow();
  });

  it('solve zero D throws', () => {
    expect(() => ldltSolve([[1]], [0], [1])).toThrow();
  });

  it('larger SPD', () => {
    const n = 5;
    const A: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => (i === j ? 4 : i === j + 1 || j === i + 1 ? -1 : 0)),
    );
    const { L, D } = ldltDecompose(A);
    const R = reconstruct(L, D);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) expect(R[i][j]).toBeCloseTo(A[i][j], 8);
  });

  it('D returns correct length', () => {
    const A = [
      [2, 1, 0],
      [1, 2, 1],
      [0, 1, 2],
    ];
    const { D } = ldltDecompose(A);
    expect(D.length).toBe(3);
  });

  it('L returns correct shape', () => {
    const A = [
      [2, 1, 0],
      [1, 2, 1],
      [0, 1, 2],
    ];
    const { L } = ldltDecompose(A);
    expect(L.length).toBe(3);
    expect(L[0].length).toBe(3);
  });
});
