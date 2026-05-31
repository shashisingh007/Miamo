import { describe, it, expect } from 'vitest';
import { matrixDeterminant } from '../matrixDeterminant';

describe('matrixDeterminant', () => {
  it('1x1 returns the entry', () => {
    expect(matrixDeterminant([[7]])).toBeCloseTo(7, 12);
  });

  it('2x2 known value', () => {
    expect(matrixDeterminant([[1, 2], [3, 4]])).toBeCloseTo(-2, 12);
  });

  it('3x3 known value', () => {
    const A = [[6, 1, 1], [4, -2, 5], [2, 8, 7]];
    expect(matrixDeterminant(A)).toBeCloseTo(-306, 9);
  });

  it('identity has det 1', () => {
    const I = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
    expect(matrixDeterminant(I)).toBeCloseTo(1, 12);
  });

  it('singular returns 0', () => {
    expect(matrixDeterminant([[1, 2], [2, 4]])).toBe(0);
  });

  it('row swap flips sign', () => {
    const A = [[1, 2], [3, 4]];
    const B = [[3, 4], [1, 2]];
    expect(matrixDeterminant(A)).toBeCloseTo(-matrixDeterminant(B), 9);
  });

  it('diagonal matrix product of diagonal', () => {
    const D = [[2, 0, 0], [0, 3, 0], [0, 0, 5]];
    expect(matrixDeterminant(D)).toBeCloseTo(30, 12);
  });

  it('triangular matrix product of diagonal', () => {
    const T = [[2, 7, 9], [0, 3, 4], [0, 0, 5]];
    expect(matrixDeterminant(T)).toBeCloseTo(30, 12);
  });

  it('handles zero leading pivot via partial pivot', () => {
    const A = [[0, 1], [1, 0]];
    expect(matrixDeterminant(A)).toBeCloseTo(-1, 12);
  });

  it('rejects empty', () => {
    expect(() => matrixDeterminant([])).toThrow();
  });

  it('rejects non-square', () => {
    expect(() => matrixDeterminant([[1, 2, 3], [4, 5, 6]])).toThrow();
  });
});
