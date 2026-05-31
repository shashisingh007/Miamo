import { describe, it, expect } from 'vitest';
import { jacobiPreconditionedCG } from '../jacobiPreconditionedCG';

function matVec(A: number[][], x: number[]): number[] {
  return A.map((row) => row.reduce((s, v, j) => s + v * x[j], 0));
}

describe('jacobiPreconditionedCG', () => {
  it('throws on empty', () => {
    expect(() => jacobiPreconditionedCG([], [])).toThrow();
  });

  it('throws on non-square', () => {
    expect(() => jacobiPreconditionedCG([[1, 2, 3]], [1])).toThrow();
  });

  it('throws on b length mismatch', () => {
    expect(() => jacobiPreconditionedCG([[1, 0], [0, 1]], [1])).toThrow();
  });

  it('throws on zero diagonal', () => {
    expect(() => jacobiPreconditionedCG([[0, 1], [1, 0]], [1, 1])).toThrow();
  });

  it('throws on bad x0 length', () => {
    expect(() => jacobiPreconditionedCG([[1, 0], [0, 1]], [1, 1], { x0: [0] })).toThrow();
  });

  it('throws on bad iterations', () => {
    expect(() => jacobiPreconditionedCG([[1, 0], [0, 1]], [1, 1], { iterations: 0 })).toThrow();
  });

  it('throws on negative tolerance', () => {
    expect(() => jacobiPreconditionedCG([[1, 0], [0, 1]], [1, 1], { tolerance: -1 })).toThrow();
  });

  it('solves identity', () => {
    const x = jacobiPreconditionedCG([[1, 0], [0, 1]], [3, 5]);
    expect(x[0]).toBeCloseTo(3, 10);
    expect(x[1]).toBeCloseTo(5, 10);
  });

  it('solves SPD 2x2', () => {
    const A = [[4, 1], [1, 3]];
    const b = [1, 2];
    const x = jacobiPreconditionedCG(A, b);
    const y = matVec(A, x);
    expect(y[0]).toBeCloseTo(b[0], 8);
    expect(y[1]).toBeCloseTo(b[1], 8);
  });

  it('solves SPD 3x3 (Poisson stencil)', () => {
    const A = [[2, -1, 0], [-1, 2, -1], [0, -1, 2]];
    const xstar = [1, 2, 3];
    const b = matVec(A, xstar);
    const x = jacobiPreconditionedCG(A, b);
    for (let i = 0; i < 3; i++) expect(x[i]).toBeCloseTo(xstar[i], 8);
  });

  it('solves diagonal scaled', () => {
    const A = [[100, 0, 0], [0, 0.01, 0], [0, 0, 1]];
    const b = [50, 0.001, 7];
    const x = jacobiPreconditionedCG(A, b);
    expect(x[0]).toBeCloseTo(0.5, 8);
    expect(x[1]).toBeCloseTo(0.1, 8);
    expect(x[2]).toBeCloseTo(7, 8);
  });

  it('zero RHS gives zero solution', () => {
    const A = [[2, -1], [-1, 2]];
    const x = jacobiPreconditionedCG(A, [0, 0]);
    expect(x[0]).toBeCloseTo(0, 12);
    expect(x[1]).toBeCloseTo(0, 12);
  });

  it('accepts x0 close to solution', () => {
    const A = [[4, 1], [1, 3]];
    const xstar = [1, 1];
    const b = matVec(A, xstar);
    const x = jacobiPreconditionedCG(A, b, { x0: [1.0001, 0.9999] });
    expect(x[0]).toBeCloseTo(1, 8);
    expect(x[1]).toBeCloseTo(1, 8);
  });

  it('respects custom tolerance', () => {
    const A = [[4, 1], [1, 3]];
    const b = [1, 2];
    const x = jacobiPreconditionedCG(A, b, { tolerance: 1e-12, iterations: 1000 });
    const y = matVec(A, x);
    expect(y[0]).toBeCloseTo(b[0], 10);
    expect(y[1]).toBeCloseTo(b[1], 10);
  });

  it('does not mutate inputs', () => {
    const A = [[2, -1], [-1, 2]];
    const b = [1, 0];
    const Aref = A.map((r) => r.slice());
    const bref = b.slice();
    jacobiPreconditionedCG(A, b);
    expect(A).toEqual(Aref);
    expect(b).toEqual(bref);
  });

  it('returns vector of correct length', () => {
    const A = [[2, -1, 0, 0], [-1, 2, -1, 0], [0, -1, 2, -1], [0, 0, -1, 2]];
    const x = jacobiPreconditionedCG(A, [1, 0, 0, 1]);
    expect(x).toHaveLength(4);
  });
});
