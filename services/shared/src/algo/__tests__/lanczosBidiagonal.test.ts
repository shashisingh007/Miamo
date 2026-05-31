import { describe, it, expect } from 'vitest';
import { lanczosBidiagonal } from '../lanczosBidiagonal';

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

describe('lanczosBidiagonal', () => {
  it('throws on empty', () => {
    expect(() => lanczosBidiagonal([], 1)).toThrow();
  });

  it('throws on k<=0', () => {
    expect(() => lanczosBidiagonal([[1, 2], [3, 4]], 0)).toThrow();
  });

  it('throws on k too large', () => {
    expect(() => lanczosBidiagonal([[1, 2], [3, 4]], 5)).toThrow();
  });

  it('throws on b mismatch', () => {
    expect(() => lanczosBidiagonal([[1, 2], [3, 4]], 1, [1])).toThrow();
  });

  it('throws on zero start', () => {
    expect(() => lanczosBidiagonal([[1, 2], [3, 4]], 1, [0, 0])).toThrow();
  });

  it('alpha length up to k', () => {
    const A = [[2, 1, 0], [1, 2, 1], [0, 1, 2]];
    const r = lanczosBidiagonal(A, 3);
    expect(r.alpha.length).toBeGreaterThan(0);
    expect(r.alpha.length).toBeLessThanOrEqual(3);
  });

  it('U columns orthonormal', () => {
    const A = [[2, 1, 0], [1, 2, 1], [0, 1, 2], [1, 0, 1]];
    const r = lanczosBidiagonal(A, 3);
    for (let i = 0; i < r.U.length; i++) {
      expect(Math.abs(dot(r.U[i], r.U[i]) - 1)).toBeLessThan(1e-8);
      for (let j = i + 1; j < r.U.length; j++) {
        expect(Math.abs(dot(r.U[i], r.U[j]))).toBeLessThan(1e-8);
      }
    }
  });

  it('V columns orthonormal', () => {
    const A = [[2, 1, 0], [1, 2, 1], [0, 1, 2], [1, 0, 1]];
    const r = lanczosBidiagonal(A, 3);
    for (let i = 0; i < r.V.length; i++) {
      if (r.alpha[i] === 0) continue;
      expect(Math.abs(dot(r.V[i], r.V[i]) - 1)).toBeLessThan(1e-8);
      for (let j = i + 1; j < r.V.length; j++) {
        if (r.alpha[j] === 0) continue;
        expect(Math.abs(dot(r.V[i], r.V[j]))).toBeLessThan(1e-8);
      }
    }
  });

  it('alpha non-negative', () => {
    const A = [[3, 1, 0], [1, 3, 1], [0, 1, 3]];
    const r = lanczosBidiagonal(A, 3);
    for (const a of r.alpha) expect(a).toBeGreaterThanOrEqual(0);
  });

  it('beta non-negative', () => {
    const A = [[3, 1, 0], [1, 3, 1], [0, 1, 3]];
    const r = lanczosBidiagonal(A, 3);
    for (const b of r.beta) expect(b).toBeGreaterThanOrEqual(0);
  });

  it('captures singular values for diag', () => {
    const A = [[5, 0, 0], [0, 4, 0], [0, 0, 3]];
    const r = lanczosBidiagonal(A, 3);
    // alpha values should be singular values for diag matrix
    const sorted = r.alpha.slice().sort((a, b) => b - a);
    expect(sorted[0]).toBeCloseTo(5, 6);
  });

  it('custom start vector', () => {
    const A = [[1, 2], [3, 4]];
    const r = lanczosBidiagonal(A, 2, [1, 1]);
    expect(r.alpha.length).toBe(2);
    expect(Math.abs(dot(r.U[0], r.U[0]) - 1)).toBeLessThan(1e-10);
  });

  it('k=1 simple', () => {
    const A = [[1, 0], [0, 2]];
    const r = lanczosBidiagonal(A, 1);
    expect(r.alpha.length).toBe(1);
  });

  it('does not mutate A', () => {
    const A = [[1, 2], [3, 4]];
    const ref = JSON.parse(JSON.stringify(A));
    lanczosBidiagonal(A, 2);
    expect(A).toEqual(ref);
  });
});
