import { describe, it, expect } from 'vitest';
import { frobeniusInnerProduct, frobeniusNorm } from '../frobeniusInnerProduct';

describe('frobeniusInnerProduct', () => {
  it('throws on empty', () => {
    expect(() => frobeniusInnerProduct([], [])).toThrow();
  });

  it('throws on dim mismatch (rows)', () => {
    expect(() => frobeniusInnerProduct([[1, 2]], [[1, 2], [3, 4]])).toThrow();
  });

  it('throws on dim mismatch (cols)', () => {
    expect(() => frobeniusInnerProduct([[1, 2]], [[1, 2, 3]])).toThrow();
  });

  it('throws on ragged A', () => {
    expect(() => frobeniusInnerProduct([[1, 2], [3]], [[1, 2], [3, 4]])).toThrow();
  });

  it('throws on zero-width', () => {
    expect(() => frobeniusInnerProduct([[]], [[]])).toThrow();
  });

  it('1x1 trivial', () => {
    expect(frobeniusInnerProduct([[3]], [[5]])).toBe(15);
  });

  it('2x2 with self gives sum of squares', () => {
    const A = [[1, 2], [3, 4]];
    expect(frobeniusInnerProduct(A, A)).toBe(1 + 4 + 9 + 16);
  });

  it('orthogonal matrices give 0', () => {
    const A = [[1, 0], [0, 0]];
    const B = [[0, 0], [0, 1]];
    expect(frobeniusInnerProduct(A, B)).toBe(0);
  });

  it('linearity in first argument', () => {
    const A1 = [[1, 0], [0, 1]];
    const A2 = [[2, 1], [0, 0]];
    const B = [[1, 1], [1, 1]];
    const lhs = frobeniusInnerProduct(A1.map((r, i) => r.map((v, j) => v + A2[i][j])), B);
    const rhs = frobeniusInnerProduct(A1, B) + frobeniusInnerProduct(A2, B);
    expect(lhs).toBeCloseTo(rhs, 12);
  });

  it('symmetry <A,B> = <B,A>', () => {
    const A = [[1, 2], [3, 4]];
    const B = [[5, 6], [7, 8]];
    expect(frobeniusInnerProduct(A, B)).toBe(frobeniusInnerProduct(B, A));
  });

  it('rectangular 2x3', () => {
    const A = [[1, 2, 3], [4, 5, 6]];
    const B = [[1, 1, 1], [1, 1, 1]];
    expect(frobeniusInnerProduct(A, B)).toBe(21);
  });

  it('does not mutate inputs', () => {
    const A = [[1, 2], [3, 4]];
    const B = [[5, 6], [7, 8]];
    const Aref = A.map((r) => r.slice());
    const Bref = B.map((r) => r.slice());
    frobeniusInnerProduct(A, B);
    expect(A).toEqual(Aref);
    expect(B).toEqual(Bref);
  });

  it('zero matrix gives 0', () => {
    expect(frobeniusInnerProduct([[1, 2], [3, 4]], [[0, 0], [0, 0]])).toBe(0);
  });
});

describe('frobeniusNorm', () => {
  it('sqrt of sum of squares', () => {
    expect(frobeniusNorm([[3, 4]])).toBe(5);
  });

  it('zero matrix => 0', () => {
    expect(frobeniusNorm([[0, 0], [0, 0]])).toBe(0);
  });

  it('identity 3x3 => sqrt(3)', () => {
    expect(frobeniusNorm([[1, 0, 0], [0, 1, 0], [0, 0, 1]])).toBeCloseTo(Math.sqrt(3), 12);
  });
});
