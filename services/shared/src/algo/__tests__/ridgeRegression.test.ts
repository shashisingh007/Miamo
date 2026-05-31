import { describe, it, expect } from 'vitest';
import { ridgeRegression } from '../ridgeRegression';

function matVec(A: number[][], x: number[]): number[] {
  return A.map((row) => row.reduce((s, v, j) => s + v * x[j], 0));
}

describe('ridgeRegression', () => {
  it('throws on empty X', () => {
    expect(() => ridgeRegression([], [], 0)).toThrow();
  });

  it('throws on zero-width X', () => {
    expect(() => ridgeRegression([[]], [0], 0)).toThrow();
  });

  it('throws on ragged X', () => {
    expect(() => ridgeRegression([[1, 2], [3]], [1, 2], 0)).toThrow();
  });

  it('throws on y length mismatch', () => {
    expect(() => ridgeRegression([[1, 2], [3, 4]], [1], 0)).toThrow();
  });

  it('throws on negative lambda', () => {
    expect(() => ridgeRegression([[1]], [1], -1)).toThrow();
  });

  it('throws on non-finite lambda', () => {
    expect(() => ridgeRegression([[1]], [1], NaN)).toThrow();
  });

  it('lambda=0 OLS for full-rank X', () => {
    const X = [[1, 0], [0, 1], [1, 1]];
    const beta_true = [2, 3];
    const y = matVec(X, beta_true);
    const b = ridgeRegression(X, y, 0);
    expect(b[0]).toBeCloseTo(2, 8);
    expect(b[1]).toBeCloseTo(3, 8);
  });

  it('lambda > 0 shrinks toward zero', () => {
    const X = [[1, 0], [0, 1]];
    const y = [10, 10];
    const b0 = ridgeRegression(X, y, 0);
    const b1 = ridgeRegression(X, y, 10);
    expect(Math.abs(b1[0])).toBeLessThan(Math.abs(b0[0]));
    expect(Math.abs(b1[1])).toBeLessThan(Math.abs(b0[1]));
  });

  it('large lambda drives beta toward zero', () => {
    const X = [[1, 0], [0, 1]];
    const y = [10, 10];
    const b = ridgeRegression(X, y, 1e8);
    expect(Math.abs(b[0])).toBeLessThan(1e-3);
    expect(Math.abs(b[1])).toBeLessThan(1e-3);
  });

  it('handles rank-deficient X with lambda > 0', () => {
    // X has duplicate columns: [[1,1],[2,2],[3,3]]; only solvable with regularization
    const X = [[1, 1], [2, 2], [3, 3]];
    const y = [4, 8, 12];
    const b = ridgeRegression(X, y, 1);
    // residuals should be small
    const yhat = matVec(X, b);
    for (let i = 0; i < y.length; i++) expect(yhat[i]).toBeCloseTo(y[i], 0);
  });

  it('overdetermined consistent system', () => {
    const X = [[1, 0], [0, 1], [1, 1], [2, 0]];
    const beta_true = [3, -2];
    const y = matVec(X, beta_true);
    const b = ridgeRegression(X, y, 1e-8);
    expect(b[0]).toBeCloseTo(3, 4);
    expect(b[1]).toBeCloseTo(-2, 4);
  });

  it('zero y => zero beta', () => {
    const b = ridgeRegression([[1, 0], [0, 1]], [0, 0], 0.5);
    expect(b[0]).toBeCloseTo(0, 12);
    expect(b[1]).toBeCloseTo(0, 12);
  });

  it('does not mutate inputs', () => {
    const X = [[1, 0], [0, 1]];
    const y = [3, 5];
    const Xref = X.map((r) => r.slice());
    const yref = y.slice();
    ridgeRegression(X, y, 0.1);
    expect(X).toEqual(Xref);
    expect(y).toEqual(yref);
  });

  it('returns beta of correct length', () => {
    const b = ridgeRegression([[1, 2, 3], [4, 5, 6]], [1, 2], 0.1);
    expect(b).toHaveLength(3);
  });

  it('1D regression', () => {
    const X = [[1], [2], [3], [4]];
    const y = [2, 4, 6, 8];
    const b = ridgeRegression(X, y, 0);
    expect(b[0]).toBeCloseTo(2, 6);
  });
});
