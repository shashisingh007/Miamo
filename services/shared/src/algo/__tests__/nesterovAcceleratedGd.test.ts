import { describe, it, expect } from 'vitest';
import { nesterovAcceleratedGd } from '../nesterovAcceleratedGd';

function matVec(A: number[][], x: number[]): number[] {
  return A.map((row) => row.reduce((s, v, j) => s + v * x[j], 0));
}

describe('nesterovAcceleratedGd', () => {
  it('throws on empty', () => {
    expect(() => nesterovAcceleratedGd([], [])).toThrow();
  });

  it('throws on non-square', () => {
    expect(() => nesterovAcceleratedGd([[1, 2, 3]], [1])).toThrow();
  });

  it('throws on b length mismatch', () => {
    expect(() => nesterovAcceleratedGd([[1, 0], [0, 1]], [1])).toThrow();
  });

  it('throws on bad iterations', () => {
    expect(() => nesterovAcceleratedGd([[1, 0], [0, 1]], [1, 1], { iterations: 0 })).toThrow();
  });

  it('throws on bad L', () => {
    expect(() => nesterovAcceleratedGd([[1, 0], [0, 1]], [1, 1], { L: 0 })).toThrow();
    expect(() => nesterovAcceleratedGd([[1, 0], [0, 1]], [1, 1], { L: -1 })).toThrow();
  });

  it('throws on x0 length mismatch', () => {
    expect(() => nesterovAcceleratedGd([[1, 0], [0, 1]], [1, 1], { x0: [0] })).toThrow();
  });

  it('solves identity SPD', () => {
    const x = nesterovAcceleratedGd([[1, 0], [0, 1]], [3, 5], { iterations: 200 });
    expect(x[0]).toBeCloseTo(3, 6);
    expect(x[1]).toBeCloseTo(5, 6);
  });

  it('solves SPD 2x2', () => {
    const A = [[4, 1], [1, 3]];
    const xstar = [1, 2];
    const b = matVec(A, xstar);
    const x = nesterovAcceleratedGd(A, b, { iterations: 1000 });
    for (let i = 0; i < 2; i++) expect(x[i]).toBeCloseTo(xstar[i], 4);
  });

  it('solves Poisson 3x3', () => {
    const A = [[2, -1, 0], [-1, 2, -1], [0, -1, 2]];
    const xstar = [1, 2, 3];
    const b = matVec(A, xstar);
    const x = nesterovAcceleratedGd(A, b, { iterations: 5000 });
    for (let i = 0; i < 3; i++) expect(x[i]).toBeCloseTo(xstar[i], 3);
  });

  it('zero b => zero solution', () => {
    const A = [[2, 0], [0, 3]];
    const x = nesterovAcceleratedGd(A, [0, 0], { iterations: 200 });
    expect(x[0]).toBeCloseTo(0, 8);
    expect(x[1]).toBeCloseTo(0, 8);
  });

  it('respects custom L', () => {
    const A = [[10, 0], [0, 10]];
    const x = nesterovAcceleratedGd(A, [10, 20], { iterations: 500, L: 10 });
    expect(x[0]).toBeCloseTo(1, 5);
    expect(x[1]).toBeCloseTo(2, 5);
  });

  it('respects warm-start x0', () => {
    const A = [[2, 0], [0, 2]];
    const xstar = [3, 4];
    const b = matVec(A, xstar);
    const x = nesterovAcceleratedGd(A, b, { iterations: 5, x0: [3, 4] });
    expect(x[0]).toBeCloseTo(3, 6);
    expect(x[1]).toBeCloseTo(4, 6);
  });

  it('does not mutate inputs', () => {
    const A = [[1, 0], [0, 1]];
    const b = [1, 2];
    const Aref = A.map((r) => r.slice());
    const bref = b.slice();
    nesterovAcceleratedGd(A, b, { iterations: 10 });
    expect(A).toEqual(Aref);
    expect(b).toEqual(bref);
  });

  it('returns vector of correct length', () => {
    const x = nesterovAcceleratedGd([[2, -1, 0, 0], [-1, 2, -1, 0], [0, -1, 2, -1], [0, 0, -1, 2]], [1, 0, 0, 1], { iterations: 500 });
    expect(x).toHaveLength(4);
  });

  it('accelerated convergence vs gradient descent (rough check)', () => {
    // Just ensure it converges to 5 decimal places quickly on well-conditioned matrix
    const A = [[3, 0, 0], [0, 3, 0], [0, 0, 3]];
    const xstar = [1, -2, 3];
    const b = matVec(A, xstar);
    const x = nesterovAcceleratedGd(A, b, { iterations: 200 });
    for (let i = 0; i < 3; i++) expect(x[i]).toBeCloseTo(xstar[i], 5);
  });
});
