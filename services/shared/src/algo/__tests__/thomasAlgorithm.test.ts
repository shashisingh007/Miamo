import { describe, it, expect } from 'vitest';
import { thomasAlgorithm } from '../thomasAlgorithm';

function multTri(a: number[], b: number[], c: number[], x: number[]): number[] {
  const n = b.length;
  const r = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    if (i > 0) r[i] += a[i - 1] * x[i - 1];
    r[i] += b[i] * x[i];
    if (i < n - 1) r[i] += c[i] * x[i + 1];
  }
  return r;
}

describe('thomasAlgorithm', () => {
  it('throws on empty', () => {
    expect(() => thomasAlgorithm([], [], [], [])).toThrow();
  });

  it('throws on dimension mismatch', () => {
    expect(() => thomasAlgorithm([1, 2], [1, 1, 1], [1], [1, 2, 3])).toThrow();
    expect(() => thomasAlgorithm([1], [1, 1], [1, 1], [1, 2])).toThrow();
    expect(() => thomasAlgorithm([1], [1, 1], [1], [1, 2, 3])).toThrow();
  });

  it('throws on zero pivot first', () => {
    expect(() => thomasAlgorithm([1], [0, 1], [1], [1, 2])).toThrow();
  });

  it('1x1 system', () => {
    expect(thomasAlgorithm([], [3], [], [9])).toEqual([3]);
  });

  it('2x2 system', () => {
    const r = thomasAlgorithm([1], [2, 2], [1], [3, 4]);
    expect(multTri([1], [2, 2], [1], r).map((v) => +v.toFixed(8))).toEqual([3, 4]);
  });

  it('3x3 system', () => {
    const a = [1, 1];
    const b = [2, 2, 2];
    const c = [1, 1];
    const d = [4, 6, 5];
    const x = thomasAlgorithm(a, b, c, d);
    const back = multTri(a, b, c, x);
    for (let i = 0; i < 3; i++) expect(back[i]).toBeCloseTo(d[i], 10);
  });

  it('larger system', () => {
    const n = 50;
    const a = new Array(n - 1).fill(-1);
    const b = new Array(n).fill(2);
    const c = new Array(n - 1).fill(-1);
    const d = new Array(n).fill(0);
    d[0] = 1;
    d[n - 1] = 1;
    const x = thomasAlgorithm(a, b, c, d);
    const back = multTri(a, b, c, x);
    for (let i = 0; i < n; i++) expect(back[i]).toBeCloseTo(d[i], 10);
  });

  it('diagonally dominant', () => {
    const a = [1, 2, 3];
    const b = [10, 10, 10, 10];
    const c = [1, 2, 3];
    const d = [11, 13, 15, 13];
    const x = thomasAlgorithm(a, b, c, d);
    const back = multTri(a, b, c, x);
    for (let i = 0; i < 4; i++) expect(back[i]).toBeCloseTo(d[i], 10);
  });

  it('identity-like', () => {
    const r = thomasAlgorithm([0, 0], [1, 1, 1], [0, 0], [5, 6, 7]);
    expect(r).toEqual([5, 6, 7]);
  });

  it('non-symmetric', () => {
    const a = [2, 3];
    const b = [4, 5, 6];
    const c = [1, 2];
    const d = [9, 16, 13];
    const x = thomasAlgorithm(a, b, c, d);
    const back = multTri(a, b, c, x);
    for (let i = 0; i < 3; i++) expect(back[i]).toBeCloseTo(d[i], 10);
  });

  it('throws on singular', () => {
    expect(() => thomasAlgorithm([1, 1], [1, 1, 1], [1, 1], [1, 2, 3])).toThrow();
  });

  it('returns array of correct length', () => {
    expect(thomasAlgorithm([1], [2, 2], [1], [3, 4]).length).toBe(2);
  });
});
