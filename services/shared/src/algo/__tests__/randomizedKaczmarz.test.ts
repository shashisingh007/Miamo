import { describe, it, expect } from 'vitest';
import { randomizedKaczmarz } from '../randomizedKaczmarz';

describe('randomizedKaczmarz', () => {
  it('throws on empty A', () => {
    expect(() => randomizedKaczmarz([], [])).toThrow();
  });

  it('throws on ragged A', () => {
    expect(() => randomizedKaczmarz([[1, 2], [3]], [0, 0])).toThrow();
  });

  it('throws on b length mismatch', () => {
    expect(() => randomizedKaczmarz([[1, 0], [0, 1]], [1])).toThrow();
  });

  it('throws on zero-width', () => {
    expect(() => randomizedKaczmarz([[]], [0])).toThrow();
  });

  it('throws on all-zero rows', () => {
    expect(() => randomizedKaczmarz([[0, 0], [0, 0]], [1, 1])).toThrow();
  });

  it('throws on bad iterations', () => {
    expect(() => randomizedKaczmarz([[1, 0], [0, 1]], [1, 1], { iterations: 0 })).toThrow();
    expect(() => randomizedKaczmarz([[1, 0], [0, 1]], [1, 1], { iterations: 1.5 })).toThrow();
  });

  it('throws on x0 length mismatch', () => {
    expect(() => randomizedKaczmarz([[1, 0], [0, 1]], [1, 1], { x0: [0] })).toThrow();
  });

  it('solves identity-like 2x2', () => {
    const x = randomizedKaczmarz([[1, 0], [0, 1]], [3, 5], { iterations: 500, seed: 42 });
    expect(x[0]).toBeCloseTo(3, 6);
    expect(x[1]).toBeCloseTo(5, 6);
  });

  it('solves 3x3 well-conditioned', () => {
    const A = [[2, 1, 0], [1, 3, 1], [0, 1, 2]];
    const xstar = [1, 2, 3];
    const b = A.map((row) => row.reduce((s, v, j) => s + v * xstar[j], 0));
    const x = randomizedKaczmarz(A, b, { iterations: 5000, seed: 7 });
    for (let i = 0; i < 3; i++) expect(x[i]).toBeCloseTo(xstar[i], 4);
  });

  it('seeded reproducibility', () => {
    const A = [[1, 1], [1, -1]];
    const b = [3, 1];
    const a = randomizedKaczmarz(A, b, { iterations: 1000, seed: 123 });
    const c = randomizedKaczmarz(A, b, { iterations: 1000, seed: 123 });
    expect(a).toEqual(c);
  });

  it('different seeds may differ in trajectory but converge', () => {
    const A = [[1, 1], [1, -1]];
    const b = [3, 1];
    const a = randomizedKaczmarz(A, b, { iterations: 5000, seed: 1 });
    const c = randomizedKaczmarz(A, b, { iterations: 5000, seed: 2 });
    expect(a[0]).toBeCloseTo(2, 4);
    expect(a[1]).toBeCloseTo(1, 4);
    expect(c[0]).toBeCloseTo(2, 4);
    expect(c[1]).toBeCloseTo(1, 4);
  });

  it('overdetermined consistent system', () => {
    const A = [[1, 0], [0, 1], [1, 1]];
    const b = [2, 3, 5];
    const x = randomizedKaczmarz(A, b, { iterations: 5000, seed: 9 });
    expect(x[0]).toBeCloseTo(2, 4);
    expect(x[1]).toBeCloseTo(3, 4);
  });

  it('respects x0 starting point', () => {
    const A = [[1, 0], [0, 1]];
    const b = [4, 7];
    const x = randomizedKaczmarz(A, b, { iterations: 200, seed: 5, x0: [4, 7] });
    expect(x[0]).toBeCloseTo(4, 10);
    expect(x[1]).toBeCloseTo(7, 10);
  });

  it('does not mutate A or b', () => {
    const A = [[1, 0], [0, 1]];
    const b = [3, 4];
    const Aref = A.map((r) => r.slice());
    const bref = b.slice();
    randomizedKaczmarz(A, b, { iterations: 100, seed: 1 });
    expect(A).toEqual(Aref);
    expect(b).toEqual(bref);
  });

  it('returns vector of correct length', () => {
    const x = randomizedKaczmarz([[1, 2, 3], [4, 5, 6]], [1, 2], { iterations: 50, seed: 1 });
    expect(x).toHaveLength(3);
  });
});
