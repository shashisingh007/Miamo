import { describe, it, expect } from 'vitest';
import { jacobiEigen } from '../jacobiEigen';

describe('jacobiEigen', () => {
  it('diagonal matrix returns sorted diagonal', () => {
    const A = [[3, 0, 0], [0, 1, 0], [0, 0, 5]];
    const { eigenvalues, converged } = jacobiEigen(A);
    expect(converged).toBe(true);
    expect(eigenvalues[0]).toBeCloseTo(5, 9);
    expect(eigenvalues[1]).toBeCloseTo(3, 9);
    expect(eigenvalues[2]).toBeCloseTo(1, 9);
  });

  it('2x2 symmetric known eigenvalues', () => {
    // [[2,1],[1,2]] => eigenvalues 3, 1
    const { eigenvalues } = jacobiEigen([[2, 1], [1, 2]]);
    expect(eigenvalues[0]).toBeCloseTo(3, 9);
    expect(eigenvalues[1]).toBeCloseTo(1, 9);
  });

  it('eigenvectors satisfy A v = lambda v', () => {
    const A = [[4, 1, 0], [1, 3, 1], [0, 1, 2]];
    const { eigenvalues, eigenvectors } = jacobiEigen(A);
    for (let k = 0; k < 3; k++) {
      const v = eigenvectors.map((row) => row[k]);
      const Av = [0, 0, 0];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) Av[i] += A[i][j] * v[j];
      for (let i = 0; i < 3; i++) expect(Av[i]).toBeCloseTo(eigenvalues[k] * v[i], 8);
    }
  });

  it('eigenvalues sorted descending', () => {
    const { eigenvalues } = jacobiEigen([[5, 0, 0], [0, 2, 0], [0, 0, 8]]);
    for (let i = 1; i < eigenvalues.length; i++)
      expect(eigenvalues[i - 1]).toBeGreaterThanOrEqual(eigenvalues[i]);
  });

  it('eigenvectors are unit norm', () => {
    const { eigenvectors } = jacobiEigen([[2, 1], [1, 2]]);
    for (let k = 0; k < 2; k++) {
      let s = 0;
      for (let i = 0; i < 2; i++) s += eigenvectors[i][k] * eigenvectors[i][k];
      expect(s).toBeCloseTo(1, 9);
    }
  });

  it('1x1 matrix', () => {
    const { eigenvalues } = jacobiEigen([[7]]);
    expect(eigenvalues).toEqual([7]);
  });

  it('handles negative entries', () => {
    const { eigenvalues } = jacobiEigen([[-2, 1], [1, -2]]);
    expect(eigenvalues[0]).toBeCloseTo(-1, 9);
    expect(eigenvalues[1]).toBeCloseTo(-3, 9);
  });

  it('rejects empty', () => {
    expect(() => jacobiEigen([])).toThrow();
  });

  it('rejects non-square', () => {
    expect(() => jacobiEigen([[1, 2, 3], [4, 5, 6]])).toThrow();
  });

  it('rejects non-symmetric', () => {
    expect(() => jacobiEigen([[1, 2], [3, 4]])).toThrow(/symmetric/);
  });

  it('rejects bad tolerance', () => {
    expect(() => jacobiEigen([[1, 0], [0, 1]], 0)).toThrow();
  });
});
