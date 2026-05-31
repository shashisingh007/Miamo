import { describe, it, expect } from 'vitest';
import { bandedMatrixSolve } from '../bandedMatrixSolve';

function multiply(A: number[][], x: number[]): number[] {
  const n = A.length;
  const y = new Array(n).fill(0);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) y[i] += A[i][j] * x[j];
  return y;
}

describe('bandedMatrixSolve', () => {
  it('throws on empty', () => {
    expect(() => bandedMatrixSolve([], [], 0, 0)).toThrow();
  });

  it('throws on length mismatch', () => {
    expect(() => bandedMatrixSolve([[1, 0], [0, 1]], [1], 0, 0)).toThrow();
  });

  it('throws on non-square', () => {
    expect(() => bandedMatrixSolve([[1, 2, 3]], [1], 0, 0)).toThrow();
  });

  it('throws on negative p', () => {
    expect(() => bandedMatrixSolve([[1]], [1], -1, 0)).toThrow();
  });

  it('throws on non-integer q', () => {
    expect(() => bandedMatrixSolve([[1]], [1], 0, 1.5)).toThrow();
  });

  it('throws on singular', () => {
    expect(() => bandedMatrixSolve([[0, 0], [0, 0]], [1, 1], 1, 1)).toThrow();
  });

  it('1x1', () => {
    expect(bandedMatrixSolve([[3]], [9], 0, 0)[0]).toBeCloseTo(3, 12);
  });

  it('diagonal', () => {
    const x = bandedMatrixSolve([[2, 0, 0], [0, 3, 0], [0, 0, 4]], [4, 9, 16], 0, 0);
    expect(x[0]).toBeCloseTo(2, 10);
    expect(x[1]).toBeCloseTo(3, 10);
    expect(x[2]).toBeCloseTo(4, 10);
  });

  it('tridiagonal', () => {
    const A = [
      [2, -1, 0, 0],
      [-1, 2, -1, 0],
      [0, -1, 2, -1],
      [0, 0, -1, 2],
    ];
    const xTrue = [1, 2, 3, 4];
    const y = multiply(A, xTrue);
    const x = bandedMatrixSolve(A, y, 1, 1);
    for (let i = 0; i < 4; i++) expect(x[i]).toBeCloseTo(xTrue[i], 8);
  });

  it('pentadiagonal', () => {
    const A = [
      [4, 1, 0.5, 0, 0],
      [1, 5, 1, 0.5, 0],
      [0.5, 1, 6, 1, 0.5],
      [0, 0.5, 1, 5, 1],
      [0, 0, 0.5, 1, 4],
    ];
    const xTrue = [1, 2, 3, 4, 5];
    const y = multiply(A, xTrue);
    const x = bandedMatrixSolve(A, y, 2, 2);
    for (let i = 0; i < 5; i++) expect(x[i]).toBeCloseTo(xTrue[i], 7);
  });

  it('upper-banded only (p=0)', () => {
    const A = [
      [2, 1, 0],
      [0, 3, 1],
      [0, 0, 4],
    ];
    const xTrue = [1, 1, 1];
    const y = multiply(A, xTrue);
    const x = bandedMatrixSolve(A, y, 0, 1);
    for (let i = 0; i < 3; i++) expect(x[i]).toBeCloseTo(xTrue[i], 8);
  });

  it('lower-banded only (q=0)', () => {
    const A = [
      [2, 0, 0],
      [1, 3, 0],
      [0, 1, 4],
    ];
    const xTrue = [1, 1, 1];
    const y = multiply(A, xTrue);
    const x = bandedMatrixSolve(A, y, 1, 0);
    for (let i = 0; i < 3; i++) expect(x[i]).toBeCloseTo(xTrue[i], 8);
  });

  it('zero rhs => zero solution', () => {
    const x = bandedMatrixSolve([[2, -1], [-1, 2]], [0, 0], 1, 1);
    for (const v of x) expect(Math.abs(v)).toBeLessThan(1e-10);
  });

  it('does not mutate inputs', () => {
    const A = [[2, -1], [-1, 2]];
    const y = [1, 2];
    const Aref = JSON.parse(JSON.stringify(A));
    const yRef = y.slice();
    bandedMatrixSolve(A, y, 1, 1);
    expect(A).toEqual(Aref);
    expect(y).toEqual(yRef);
  });

  it('output length n', () => {
    expect(bandedMatrixSolve([[2, -1], [-1, 2]], [1, 2], 1, 1)).toHaveLength(2);
  });

  it('residual small', () => {
    const A = [[3, 1, 0, 0], [1, 4, 1, 0], [0, 1, 5, 1], [0, 0, 1, 6]];
    const xTrue = [1, -1, 2, 0.5];
    const y = multiply(A, xTrue);
    const x = bandedMatrixSolve(A, y, 1, 1);
    const res = multiply(A, x);
    for (let i = 0; i < 4; i++) expect(res[i]).toBeCloseTo(y[i], 8);
  });
});
