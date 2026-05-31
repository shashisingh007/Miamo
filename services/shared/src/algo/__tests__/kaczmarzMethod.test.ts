import { describe, it, expect } from 'vitest';
import { kaczmarzMethod } from '../kaczmarzMethod';

describe('kaczmarzMethod', () => {
  it('throws on empty', () => {
    expect(() => kaczmarzMethod([], [])).toThrow();
  });

  it('throws on uneven rows', () => {
    expect(() => kaczmarzMethod([[1, 2], [3]], [1, 2])).toThrow();
  });

  it('throws on b length mismatch', () => {
    expect(() => kaczmarzMethod([[1, 0], [0, 1]], [1])).toThrow();
  });

  it('throws on zero row', () => {
    expect(() => kaczmarzMethod([[0, 0], [0, 1]], [1, 1])).toThrow();
  });

  it('throws on bad opts', () => {
    expect(() => kaczmarzMethod([[1, 0], [0, 1]], [1, 1], { maxIter: 0 })).toThrow();
    expect(() => kaczmarzMethod([[1, 0], [0, 1]], [1, 1], { tol: 0 })).toThrow();
    expect(() => kaczmarzMethod([[1, 0], [0, 1]], [1, 1], { x0: [0] })).toThrow();
  });

  it('solves identity', () => {
    const r = kaczmarzMethod([[1, 0], [0, 1]], [3, 4]);
    expect(r.converged).toBe(true);
    expect(r.x[0]).toBeCloseTo(3, 6);
    expect(r.x[1]).toBeCloseTo(4, 6);
  });

  it('solves consistent square system', () => {
    const A = [
      [4, 1],
      [1, 3],
    ];
    const b = [9, 8];
    const r = kaczmarzMethod(A, b, { maxIter: 5000, tol: 1e-10 });
    expect(r.converged).toBe(true);
    expect(r.x[0]).toBeCloseTo(19 / 11, 4);
    expect(r.x[1]).toBeCloseTo(23 / 11, 4);
  });

  it('solves overdetermined consistent', () => {
    const A = [
      [1, 0],
      [0, 1],
      [1, 1],
    ];
    const b = [2, 3, 5];
    const r = kaczmarzMethod(A, b, { maxIter: 2000, tol: 1e-10 });
    expect(r.converged).toBe(true);
    expect(r.x[0]).toBeCloseTo(2, 6);
    expect(r.x[1]).toBeCloseTo(3, 6);
  });

  it('underdetermined returns minimum norm-ish', () => {
    const A = [[1, 1]];
    const b = [4];
    const r = kaczmarzMethod(A, b);
    expect(r.x[0] + r.x[1]).toBeCloseTo(4, 6);
  });

  it('randomized variant works', () => {
    const r = kaczmarzMethod([[1, 0], [0, 1]], [3, 4], { randomized: true, seed: 42 });
    expect(r.x[0]).toBeCloseTo(3, 4);
    expect(r.x[1]).toBeCloseTo(4, 4);
  });

  it('respects x0', () => {
    const r = kaczmarzMethod([[1, 0], [0, 1]], [5, 6], { x0: [5, 6], maxIter: 2 });
    expect(r.x[0]).toBeCloseTo(5, 8);
    expect(r.x[1]).toBeCloseTo(6, 8);
  });

  it('reports non-converged', () => {
    const A = [
      [4, 1],
      [1, 3],
    ];
    const r = kaczmarzMethod(A, [9, 8], { maxIter: 2, tol: 1e-15 });
    expect(r.converged).toBe(false);
  });

  it('residual reported', () => {
    const r = kaczmarzMethod([[1, 0], [0, 1]], [3, 4], { tol: 1e-12 });
    expect(r.residual).toBeLessThan(1e-10);
  });

  it('larger system', () => {
    const n = 8;
    const A: number[][] = [];
    const xt = Array.from({ length: n }, (_, i) => i + 1);
    for (let i = 0; i < n; i++) {
      const row = new Array(n).fill(0);
      for (let j = 0; j < n; j++) row[j] = (i + j + 1) % 5 + (i === j ? 10 : 0);
      A.push(row);
    }
    const b = A.map((row) => row.reduce((s, v, j) => s + v * xt[j], 0));
    const r = kaczmarzMethod(A, b, { maxIter: 100000, tol: 1e-8 });
    expect(r.converged).toBe(true);
    for (let i = 0; i < n; i++) expect(r.x[i]).toBeCloseTo(xt[i], 4);
  });
});
