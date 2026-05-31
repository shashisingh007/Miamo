import { describe, it, expect } from 'vitest';
import { circulantSolve } from '../circulantSolve';

function multiply(c: number[], x: number[]): number[] {
  const n = c.length;
  const y = new Array(n).fill(0);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) y[i] += c[((i - j) % n + n) % n] * x[j];
  return y;
}

describe('circulantSolve', () => {
  it('throws on empty', () => {
    expect(() => circulantSolve([], [])).toThrow();
  });

  it('throws on length mismatch', () => {
    expect(() => circulantSolve([1, 0], [1])).toThrow();
  });

  it('throws on singular', () => {
    expect(() => circulantSolve([0, 0, 0], [1, 1, 1])).toThrow();
  });

  it('1x1', () => {
    expect(circulantSolve([3], [9])[0]).toBeCloseTo(3, 12);
  });

  it('identity (only c[0]=1)', () => {
    const x = circulantSolve([1, 0, 0, 0], [4, 5, 6, 7]);
    expect(x[0]).toBeCloseTo(4, 10);
    expect(x[1]).toBeCloseTo(5, 10);
    expect(x[2]).toBeCloseTo(6, 10);
    expect(x[3]).toBeCloseTo(7, 10);
  });

  it('cyclic shift', () => {
    // c=[0,1,0,0] => C is cyclic shift; solving gives reverse-shifted y
    const c = [0, 1, 0, 0];
    const y = [10, 20, 30, 40];
    const x = circulantSolve(c, y);
    const back = multiply(c, x);
    for (let i = 0; i < 4; i++) expect(back[i]).toBeCloseTo(y[i], 8);
  });

  it('size 4 generic', () => {
    const c = [4, 1, 0.5, 0.25];
    const xTrue = [1, -2, 3, 0.5];
    const y = multiply(c, xTrue);
    const x = circulantSolve(c, y);
    for (let i = 0; i < 4; i++) expect(x[i]).toBeCloseTo(xTrue[i], 6);
  });

  it('zero rhs => zero', () => {
    const x = circulantSolve([3, 1, 0.5], [0, 0, 0]);
    for (const v of x) expect(Math.abs(v)).toBeLessThan(1e-10);
  });

  it('linearity in y', () => {
    const c = [3, 1, 0.5];
    const a = circulantSolve(c, [1, 2, 3]);
    const b = circulantSolve(c, [2, 4, 6]);
    for (let i = 0; i < 3; i++) expect(b[i]).toBeCloseTo(2 * a[i], 8);
  });

  it('does not mutate inputs', () => {
    const c = [3, 1, 0.5];
    const y = [1, 2, 3];
    const cRef = c.slice();
    const yRef = y.slice();
    circulantSolve(c, y);
    expect(c).toEqual(cRef);
    expect(y).toEqual(yRef);
  });

  it('output length equals n', () => {
    expect(circulantSolve([2, 1, 0.5], [1, 1, 1])).toHaveLength(3);
  });

  it('residual small', () => {
    const c = [5, 2, 1, 0.5, 0.25];
    const xTrue = [3, -1, 2, 4, 0.5];
    const y = multiply(c, xTrue);
    const x = circulantSolve(c, y);
    const res = multiply(c, x);
    for (let i = 0; i < 5; i++) expect(res[i]).toBeCloseTo(y[i], 6);
  });

  it('handles negatives', () => {
    const c = [4, -1, 0.5];
    const xTrue = [1, 1, 1];
    const y = multiply(c, xTrue);
    const x = circulantSolve(c, y);
    for (let i = 0; i < 3; i++) expect(x[i]).toBeCloseTo(xTrue[i], 8);
  });

  it('size 6', () => {
    const c = [6, 1, 0.5, 0.25, 0.125, 0.0625];
    const xTrue = [1, 2, -1, 0.5, 3, -2];
    const y = multiply(c, xTrue);
    const x = circulantSolve(c, y);
    for (let i = 0; i < 6; i++) expect(x[i]).toBeCloseTo(xTrue[i], 6);
  });

  it('symmetric circulant constant rhs', () => {
    const c = [3, 1, 1];
    const sum = c[0] + c[1] + c[2];
    const x = circulantSolve(c, [sum, sum, sum]);
    for (const v of x) expect(v).toBeCloseTo(1, 8);
  });
});
