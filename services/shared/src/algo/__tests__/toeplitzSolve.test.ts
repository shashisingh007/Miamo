import { describe, it, expect } from 'vitest';
import { toeplitzSolve } from '../toeplitzSolve';

function multiply(r: number[], x: number[]): number[] {
  const n = r.length;
  const y = new Array(n).fill(0);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) y[i] += r[Math.abs(i - j)] * x[j];
  return y;
}

describe('toeplitzSolve', () => {
  it('throws on empty', () => {
    expect(() => toeplitzSolve([], [])).toThrow();
  });

  it('throws on length mismatch', () => {
    expect(() => toeplitzSolve([1, 0], [1])).toThrow();
  });

  it('throws on singular', () => {
    expect(() => toeplitzSolve([0, 0], [1, 1])).toThrow();
  });

  it('1x1', () => {
    expect(toeplitzSolve([2], [6])[0]).toBeCloseTo(3, 12);
  });

  it('identity', () => {
    const x = toeplitzSolve([1, 0, 0], [4, 5, 6]);
    expect(x[0]).toBeCloseTo(4, 10);
    expect(x[1]).toBeCloseTo(5, 10);
    expect(x[2]).toBeCloseTo(6, 10);
  });

  it('symmetric tridiagonal', () => {
    const r = [2, -1, 0, 0];
    const xTrue = [1, 2, 3, 4];
    const y = multiply(r, xTrue);
    const x = toeplitzSolve(r, y);
    for (let i = 0; i < 4; i++) expect(x[i]).toBeCloseTo(xTrue[i], 8);
  });

  it('full symmetric Toeplitz', () => {
    const r = [4, 1, 0.5, 0.25];
    const xTrue = [1, -2, 3, 0.5];
    const y = multiply(r, xTrue);
    const x = toeplitzSolve(r, y);
    for (let i = 0; i < 4; i++) expect(x[i]).toBeCloseTo(xTrue[i], 6);
  });

  it('zero rhs => zero solution', () => {
    const r = [3, 1, 0.5];
    const x = toeplitzSolve(r, [0, 0, 0]);
    for (const v of x) expect(Math.abs(v)).toBeLessThan(1e-10);
  });

  it('linearity in y', () => {
    const r = [3, 1, 0.5];
    const a = toeplitzSolve(r, [1, 2, 3]);
    const b = toeplitzSolve(r, [2, 4, 6]);
    for (let i = 0; i < 3; i++) expect(b[i]).toBeCloseTo(2 * a[i], 8);
  });

  it('does not mutate inputs', () => {
    const r = [3, 1, 0.5];
    const y = [1, 2, 3];
    const rRef = r.slice();
    const yRef = y.slice();
    toeplitzSolve(r, y);
    expect(r).toEqual(rRef);
    expect(y).toEqual(yRef);
  });

  it('output length equals n', () => {
    expect(toeplitzSolve([2, 1, 0.5], [1, 1, 1])).toHaveLength(3);
  });

  it('residual small', () => {
    const r = [5, 2, 1, 0.5];
    const xTrue = [3, -1, 2, 4];
    const y = multiply(r, xTrue);
    const x = toeplitzSolve(r, y);
    const res = multiply(r, x);
    for (let i = 0; i < 4; i++) expect(res[i]).toBeCloseTo(y[i], 6);
  });

  it('handles negative entries', () => {
    const r = [4, -1, 0];
    const xTrue = [1, 1, 1];
    const y = multiply(r, xTrue);
    const x = toeplitzSolve(r, y);
    for (let i = 0; i < 3; i++) expect(x[i]).toBeCloseTo(xTrue[i], 8);
  });

  it('size 5', () => {
    const r = [3, 1, 0.4, 0.2, 0.1];
    const xTrue = [1, 2, -1, 0.5, 3];
    const y = multiply(r, xTrue);
    const x = toeplitzSolve(r, y);
    for (let i = 0; i < 5; i++) expect(x[i]).toBeCloseTo(xTrue[i], 6);
  });

  it('scaling', () => {
    const r = [4, 1, 0.5];
    const x1 = toeplitzSolve(r, [1, 2, 3]);
    const r2 = r.map((v) => 2 * v);
    const x2 = toeplitzSolve(r2, [1, 2, 3]);
    for (let i = 0; i < 3; i++) expect(x2[i]).toBeCloseTo(0.5 * x1[i], 8);
  });
});
