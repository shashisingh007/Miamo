import { describe, it, expect } from 'vitest';
import { matrixTrace } from '../matrixTrace';

describe('matrixTrace', () => {
  it('throws on empty', () => {
    expect(() => matrixTrace([])).toThrow();
  });

  it('throws on non-square', () => {
    expect(() => matrixTrace([[1, 2, 3]])).toThrow();
  });

  it('throws on ragged', () => {
    expect(() => matrixTrace([[1, 2], [3]])).toThrow();
  });

  it('throws on non-finite diagonal', () => {
    expect(() => matrixTrace([[NaN, 0], [0, 1]])).toThrow();
  });

  it('1x1 returns the entry', () => {
    expect(matrixTrace([[42]])).toBe(42);
  });

  it('identity 3x3 => 3', () => {
    expect(matrixTrace([[1, 0, 0], [0, 1, 0], [0, 0, 1]])).toBe(3);
  });

  it('zero matrix => 0', () => {
    expect(matrixTrace([[0, 0], [0, 0]])).toBe(0);
  });

  it('arithmetic 2x2', () => {
    expect(matrixTrace([[1, 2], [3, 4]])).toBe(5);
  });

  it('negative diagonal', () => {
    expect(matrixTrace([[-1, 0, 0], [0, -2, 0], [0, 0, -3]])).toBe(-6);
  });

  it('linearity tr(A+B) = tr(A) + tr(B)', () => {
    const A = [[1, 5], [6, 2]];
    const B = [[3, 4], [7, 8]];
    const sumM = A.map((row, i) => row.map((v, j) => v + B[i][j]));
    expect(matrixTrace(sumM)).toBe(matrixTrace(A) + matrixTrace(B));
  });

  it('large diagonal 5x5', () => {
    const A = [
      [1, 0, 0, 0, 0],
      [0, 2, 0, 0, 0],
      [0, 0, 3, 0, 0],
      [0, 0, 0, 4, 0],
      [0, 0, 0, 0, 5],
    ];
    expect(matrixTrace(A)).toBe(15);
  });

  it('does not mutate input', () => {
    const A = [[1, 2], [3, 4]];
    const ref = A.map((r) => r.slice());
    matrixTrace(A);
    expect(A).toEqual(ref);
  });
});
