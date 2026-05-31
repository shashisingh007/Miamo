import { describe, it, expect } from 'vitest';
import { gaussianElimination } from '../gaussianElimination';

function approxEq(a: number[], b: number[], tol = 1e-8): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (Math.abs(a[i] - b[i]) > tol) return false;
  return true;
}

describe('gaussianElimination', () => {
  it('rejects non-array', () => {
    expect(() => gaussianElimination('x' as any, [1])).toThrow(TypeError);
    expect(() => gaussianElimination([[1]], 'x' as any)).toThrow(TypeError);
  });

  it('rejects non-square', () => {
    expect(() => gaussianElimination([[1, 2]], [1])).toThrow(RangeError);
  });

  it('rejects mismatched b length', () => {
    expect(() => gaussianElimination([[1, 2], [3, 4]], [1, 2, 3])).toThrow(RangeError);
  });

  it('rejects non-finite', () => {
    expect(() => gaussianElimination([[1, NaN], [3, 4]], [1, 2])).toThrow(RangeError);
    expect(() => gaussianElimination([[1, 2], [3, 4]], [1, Infinity])).toThrow(RangeError);
  });

  it('empty system returns []', () => {
    expect(gaussianElimination([], [])).toEqual([]);
  });

  it('1x1 system', () => {
    expect(gaussianElimination([[3]], [12])).toEqual([4]);
  });

  it('2x2 simple', () => {
    // x + y = 3 ; x - y = 1  => x=2,y=1
    expect(gaussianElimination([[1, 1], [1, -1]], [3, 1])).toEqual([2, 1]);
  });

  it('3x3 system', () => {
    // x+y+z=6 ; 2y+5z=-4 ; 2x+5y-z=27
    const A = [
      [1, 1, 1],
      [0, 2, 5],
      [2, 5, -1],
    ];
    const b = [6, -4, 27];
    const x = gaussianElimination(A, b);
    expect(approxEq(x, [5, 3, -2], 1e-9)).toBe(true);
  });

  it('requires partial pivoting (zero pivot in first row)', () => {
    // First-column zero: needs pivoting.
    // 0*x + y = 1 ; x + y = 2  =>  swap rows -> x=1, y=1
    const x = gaussianElimination([[0, 1], [1, 1]], [1, 2]);
    expect(approxEq(x, [1, 1])).toBe(true);
  });

  it('throws on singular matrix', () => {
    expect(() => gaussianElimination([[1, 2], [2, 4]], [3, 6])).toThrow(/singular/);
  });

  it('throws on near-singular matrix', () => {
    expect(() => gaussianElimination([[1, 1], [1, 1 + 1e-20]], [2, 2])).toThrow(/singular/);
  });

  it('does not mutate inputs', () => {
    const A = [[1, 1], [1, -1]];
    const b = [3, 1];
    const Asnap = JSON.parse(JSON.stringify(A));
    const bsnap = b.slice();
    gaussianElimination(A, b);
    expect(A).toEqual(Asnap);
    expect(b).toEqual(bsnap);
  });

  it('verifies Ax = b for random 5x5 system', () => {
    const n = 5;
    const A: number[][] = [];
    const x: number[] = [];
    for (let i = 0; i < n; i += 1) {
      x.push(Math.random() * 10 - 5);
      const row: number[] = [];
      for (let j = 0; j < n; j += 1) row.push(Math.random() * 10 - 5);
      A.push(row);
    }
    // Make A diagonally dominant so it's not singular
    for (let i = 0; i < n; i += 1) A[i][i] += 10 * n;
    const b: number[] = [];
    for (let i = 0; i < n; i += 1) {
      let s = 0;
      for (let j = 0; j < n; j += 1) s += A[i][j] * x[j];
      b.push(s);
    }
    const solved = gaussianElimination(A, b);
    expect(approxEq(solved, x, 1e-6)).toBe(true);
  });

  it('rejects bad tolerance', () => {
    expect(() => gaussianElimination([[1]], [1], 0)).toThrow(RangeError);
    expect(() => gaussianElimination([[1]], [1], -1)).toThrow(RangeError);
  });

  it('negative numbers', () => {
    const x = gaussianElimination([[-1, 0], [0, -2]], [-3, -8]);
    expect(approxEq(x, [3, 4])).toBe(true);
  });

  it('identity matrix returns b', () => {
    const I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    expect(gaussianElimination(I, [7, -2, 5])).toEqual([7, -2, 5]);
  });

  it('large diagonal system n=10', () => {
    const n = 10;
    const A: number[][] = [];
    const b: number[] = [];
    for (let i = 0; i < n; i += 1) {
      const row = new Array(n).fill(0);
      row[i] = i + 1;
      A.push(row);
      b.push((i + 1) * 2);
    }
    const x = gaussianElimination(A, b);
    expect(approxEq(x, new Array(n).fill(2))).toBe(true);
  });
});
