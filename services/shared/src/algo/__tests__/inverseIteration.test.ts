import { describe, it, expect } from 'vitest';
import { inverseIteration } from '../inverseIteration';

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

describe('inverseIteration', () => {
  it('throws on empty', () => {
    expect(() => inverseIteration([], 0)).toThrow();
  });

  it('throws on non-square', () => {
    expect(() => inverseIteration([[1, 2]], 0)).toThrow();
  });

  it('throws on bad opts', () => {
    expect(() => inverseIteration([[1]], 0, { maxIter: 0 })).toThrow();
    expect(() => inverseIteration([[1]], 0, { tol: 0 })).toThrow();
    expect(() => inverseIteration([[1]], 0, { v0: [1, 2] })).toThrow();
    expect(() => inverseIteration([[1]], 0, { v0: [0] })).toThrow();
  });

  it('throws on non-finite shift', () => {
    expect(() => inverseIteration([[1]], NaN)).toThrow();
  });

  it('throws on shift equal eigenvalue (singular)', () => {
    expect(() => inverseIteration([[3, 0], [0, 5]], 3)).toThrow();
  });

  it('1x1', () => {
    const r = inverseIteration([[7]], 0);
    expect(r.eigenvalue).toBeCloseTo(7, 8);
  });

  it('2x2 finds nearest eigenvalue', () => {
    const A = [[3, 0], [0, 5]];
    const r = inverseIteration(A, 4.6);
    expect(r.eigenvalue).toBeCloseTo(5, 6);
  });

  it('2x2 lower side', () => {
    const A = [[3, 0], [0, 5]];
    const r = inverseIteration(A, 2.5);
    expect(r.eigenvalue).toBeCloseTo(3, 6);
  });

  it('2x2 symmetric', () => {
    const A = [
      [4, 1],
      [1, 3],
    ];
    const r = inverseIteration(A, 4.5);
    expect(residual(A, r.eigenvalue, r.eigenvector)).toBeLessThan(1e-6);
  });

  it('3x3 symmetric', () => {
    const A = [
      [4, 1, 0],
      [1, 3, 1],
      [0, 1, 2],
    ];
    const r = inverseIteration(A, 1, { maxIter: 200 });
    expect(residual(A, r.eigenvalue, r.eigenvector)).toBeLessThan(1e-6);
  });

  it('eigenvector unit norm', () => {
    const A = [
      [2, 1],
      [1, 3],
    ];
    const r = inverseIteration(A, 0);
    let s = 0;
    for (const v of r.eigenvector) s += v * v;
    expect(Math.sqrt(s)).toBeCloseTo(1, 8);
  });

  it('respects custom v0', () => {
    const A = [[2, 0], [0, 5]];
    const r = inverseIteration(A, 1.5, { v0: [1, 0] });
    expect(r.eigenvalue).toBeCloseTo(2, 6);
  });

  it('iters reported', () => {
    const r = inverseIteration([[2, 1], [1, 3]], 1);
    expect(r.iters).toBeGreaterThan(0);
  });

  it('low maxIter', () => {
    const r = inverseIteration([[2, 1], [1, 3]], 1, { maxIter: 1, tol: 1e-15 });
    expect(typeof r.converged).toBe('boolean');
  });

  it('returns eigenvector of correct length', () => {
    const r = inverseIteration([[1, 0, 0], [0, 2, 0], [0, 0, 3]], 0.5);
    expect(r.eigenvector.length).toBe(3);
  });

  it('Wilkinson tridiag', () => {
    const A = [
      [2, -1, 0, 0],
      [-1, 2, -1, 0],
      [0, -1, 2, -1],
      [0, 0, -1, 2],
    ];
    const r = inverseIteration(A, 0.4, { tol: 1e-12, maxIter: 200 });
    expect(residual(A, r.eigenvalue, r.eigenvector)).toBeLessThan(1e-6);
  });
});
