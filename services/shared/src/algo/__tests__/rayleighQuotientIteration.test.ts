import { describe, it, expect } from 'vitest';
import { rayleighQuotientIteration } from '../rayleighQuotientIteration';

function residual(A: number[][], lambda: number, v: number[]): number {
  const n = A.length;
  let s = 0;
  for (let i = 0; i < n; i++) {
    let row = 0;
    for (let j = 0; j < n; j++) row += A[i][j] * v[j];
    row -= lambda * v[i];
    s += row * row;
  }
  return Math.sqrt(s);
}

describe('rayleighQuotientIteration', () => {
  it('throws on empty', () => {
    expect(() => rayleighQuotientIteration([])).toThrow();
  });

  it('throws on non-square', () => {
    expect(() => rayleighQuotientIteration([[1, 2]])).toThrow();
  });

  it('throws on bad opts', () => {
    expect(() => rayleighQuotientIteration([[1]], { maxIter: 0 })).toThrow();
    expect(() => rayleighQuotientIteration([[1]], { tol: 0 })).toThrow();
    expect(() => rayleighQuotientIteration([[1]], { v0: [1, 2] })).toThrow();
    expect(() => rayleighQuotientIteration([[1]], { v0: [0] })).toThrow();
  });

  it('1x1', () => {
    const r = rayleighQuotientIteration([[5]]);
    expect(r.converged).toBe(true);
    expect(r.eigenvalue).toBeCloseTo(5, 10);
  });

  it('2x2 diagonal', () => {
    const r = rayleighQuotientIteration([[3, 0], [0, 7]], { v0: [0, 1] });
    expect(r.converged).toBe(true);
    expect(r.eigenvalue).toBeCloseTo(7, 6);
  });

  it('2x2 symmetric', () => {
    const A = [
      [4, 1],
      [1, 3],
    ];
    const r = rayleighQuotientIteration(A);
    expect(r.converged).toBe(true);
    expect(residual(A, r.eigenvalue, r.eigenvector)).toBeLessThan(1e-6);
  });

  it('3x3 symmetric', () => {
    const A = [
      [4, 1, 0],
      [1, 3, 1],
      [0, 1, 2],
    ];
    const r = rayleighQuotientIteration(A, { tol: 1e-12, maxIter: 200 });
    expect(r.converged).toBe(true);
    expect(residual(A, r.eigenvalue, r.eigenvector)).toBeLessThan(1e-6);
  });

  it('eigenvector unit norm', () => {
    const A = [
      [2, 1],
      [1, 3],
    ];
    const r = rayleighQuotientIteration(A);
    let s = 0;
    for (const v of r.eigenvector) s += v * v;
    expect(Math.sqrt(s)).toBeCloseTo(1, 8);
  });

  it('respects custom v0', () => {
    const A = [[2, 0], [0, 5]];
    const r = rayleighQuotientIteration(A, { v0: [1, 0] });
    expect(r.eigenvalue).toBeCloseTo(2, 6);
  });

  it('non-symm matrix still has eigen', () => {
    const A = [
      [2, 1],
      [0, 3],
    ];
    const r = rayleighQuotientIteration(A);
    expect(residual(A, r.eigenvalue, r.eigenvector)).toBeLessThan(1e-4);
  });

  it('iters reported', () => {
    const r = rayleighQuotientIteration([[2, 1], [1, 3]]);
    expect(r.iters).toBeGreaterThan(0);
  });

  it('low maxIter', () => {
    const r = rayleighQuotientIteration([[2, 1], [1, 3]], { maxIter: 1, tol: 1e-15 });
    expect(typeof r.converged).toBe('boolean');
  });

  it('returns eigenvector of correct length', () => {
    const r = rayleighQuotientIteration([[1, 0, 0], [0, 2, 0], [0, 0, 3]]);
    expect(r.eigenvector.length).toBe(3);
  });

  it('Wilkinson-style tridiag', () => {
    const A = [
      [2, -1, 0, 0],
      [-1, 2, -1, 0],
      [0, -1, 2, -1],
      [0, 0, -1, 2],
    ];
    const r = rayleighQuotientIteration(A, { v0: [1, 1, 1, 1], tol: 1e-12, maxIter: 200 });
    expect(residual(A, r.eigenvalue, r.eigenvector)).toBeLessThan(1e-6);
  });

  it('handles already eigenvector start', () => {
    const A = [[3, 0], [0, 5]];
    const r = rayleighQuotientIteration(A, { v0: [0, 1] });
    expect(r.eigenvalue).toBeCloseTo(5, 8);
  });
});
