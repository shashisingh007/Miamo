import { describe, it, expect } from 'vitest';
import { vandermondeSolve } from '../vandermondeSolve';

function evalPoly(a: number[], x: number): number {
  let s = 0;
  for (let i = a.length - 1; i >= 0; i--) s = s * x + a[i];
  return s;
}

describe('vandermondeSolve', () => {
  it('throws on empty', () => {
    expect(() => vandermondeSolve([], [])).toThrow();
  });

  it('throws on length mismatch', () => {
    expect(() => vandermondeSolve([1, 2], [1])).toThrow();
  });

  it('throws on duplicate nodes', () => {
    expect(() => vandermondeSolve([1, 1, 2], [1, 2, 3])).toThrow();
  });

  it('1 point => constant', () => {
    expect(vandermondeSolve([3], [7])).toEqual([7]);
  });

  it('2 points => linear', () => {
    const a = vandermondeSolve([0, 1], [1, 3]);
    expect(a[0]).toBeCloseTo(1, 12);
    expect(a[1]).toBeCloseTo(2, 12);
  });

  it('3 points => quadratic', () => {
    const xs = [-1, 0, 1];
    const ys = xs.map((x) => 2 * x * x - x + 3);
    const a = vandermondeSolve(xs, ys);
    expect(a[0]).toBeCloseTo(3, 10);
    expect(a[1]).toBeCloseTo(-1, 10);
    expect(a[2]).toBeCloseTo(2, 10);
  });

  it('interpolates exactly', () => {
    const xs = [0, 1, 2, 3, 4];
    const ys = [1, 4, 7, 12, 21];
    const a = vandermondeSolve(xs, ys);
    for (let i = 0; i < xs.length; i++) {
      expect(evalPoly(a, xs[i])).toBeCloseTo(ys[i], 8);
    }
  });

  it('zero ys gives zero coefficients', () => {
    const xs = [0, 1, 2];
    const a = vandermondeSolve(xs, [0, 0, 0]);
    for (const v of a) expect(Math.abs(v)).toBeLessThan(1e-12);
  });

  it('linear in y', () => {
    const xs = [0, 1, 2];
    const a1 = vandermondeSolve(xs, [1, 2, 3]);
    const a2 = vandermondeSolve(xs, [2, 4, 6]);
    for (let i = 0; i < 3; i++) expect(a2[i]).toBeCloseTo(2 * a1[i], 10);
  });

  it('handles negative xs', () => {
    const xs = [-2, -1, 0, 1];
    const ys = xs.map((x) => x * x * x);
    const a = vandermondeSolve(xs, ys);
    expect(a[3]).toBeCloseTo(1, 8);
    expect(Math.abs(a[2])).toBeLessThan(1e-8);
    expect(Math.abs(a[1])).toBeLessThan(1e-8);
    expect(Math.abs(a[0])).toBeLessThan(1e-8);
  });

  it('eval at new node matches polynomial', () => {
    const xs = [0, 1, 2, 3];
    const ys = xs.map((x) => x * x + 1);
    const a = vandermondeSolve(xs, ys);
    expect(evalPoly(a, 5)).toBeCloseTo(26, 6);
  });

  it('does not mutate inputs', () => {
    const xs = [0, 1, 2];
    const ys = [1, 2, 4];
    const refX = xs.slice();
    const refY = ys.slice();
    vandermondeSolve(xs, ys);
    expect(xs).toEqual(refX);
    expect(ys).toEqual(refY);
  });

  it('coefficients length equals nodes', () => {
    const a = vandermondeSolve([0, 1, 2, 3, 4, 5], [0, 1, 4, 9, 16, 25]);
    expect(a).toHaveLength(6);
  });

  it('higher-degree polynomial recovered', () => {
    const coeffs = [1, -2, 3, -4, 5];
    const xs = [-2, -1, 0, 1, 2];
    const ys = xs.map((x) => evalPoly(coeffs, x));
    const a = vandermondeSolve(xs, ys);
    for (let i = 0; i < 5; i++) expect(a[i]).toBeCloseTo(coeffs[i], 6);
  });
});
