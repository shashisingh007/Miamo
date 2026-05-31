import { describe, it, expect } from 'vitest';
import { givensRotation, applyGivensLeft, applyGivensRight } from '../givensRotation';

describe('givensRotation', () => {
  it('throws on non-finite', () => {
    expect(() => givensRotation(NaN, 1)).toThrow();
    expect(() => givensRotation(1, Infinity)).toThrow();
  });

  it('b=0 yields (1,0) when a>=0', () => {
    const r = givensRotation(3, 0);
    expect(r.c).toBe(1);
    expect(r.s).toBe(0);
  });

  it('b=0 yields (-1,0) when a<0', () => {
    const r = givensRotation(-2, 0);
    expect(r.c).toBe(-1);
    expect(r.s).toBe(0);
  });

  it('zeros out b', () => {
    const a = 3;
    const b = 4;
    const { c, s } = givensRotation(a, b);
    const r1 = c * a - s * b;
    const r2 = s * a + c * b;
    expect(Math.abs(r2)).toBeLessThan(1e-12);
    expect(Math.abs(r1)).toBeCloseTo(5, 8);
  });

  it('|b|>|a| branch', () => {
    const a = 1;
    const b = 5;
    const { c, s } = givensRotation(a, b);
    expect(Math.abs(s * a + c * b)).toBeLessThan(1e-12);
  });

  it('orthogonality c^2+s^2=1', () => {
    const r = givensRotation(7, -3);
    expect(r.c * r.c + r.s * r.s).toBeCloseTo(1, 12);
  });

  it('applyGivensLeft empty throws', () => {
    expect(() => applyGivensLeft([], 0, 1, 1, 0)).toThrow();
  });

  it('applyGivensLeft OOB throws', () => {
    expect(() => applyGivensLeft([[1], [2]], -1, 1, 1, 0)).toThrow();
    expect(() => applyGivensLeft([[1], [2]], 0, 5, 1, 0)).toThrow();
    expect(() => applyGivensLeft([[1], [2]], 0, 0, 1, 0)).toThrow();
  });

  it('applyGivensLeft zeroes A[k][col]', () => {
    const A = [
      [3, 1],
      [4, 2],
    ];
    const { c, s } = givensRotation(A[0][0], A[1][0]);
    const out = applyGivensLeft(A, 0, 1, c, s);
    expect(Math.abs(out[1][0])).toBeLessThan(1e-12);
  });

  it('applyGivensRight empty throws', () => {
    expect(() => applyGivensRight([], 0, 1, 1, 0)).toThrow();
  });

  it('applyGivensRight OOB throws', () => {
    expect(() => applyGivensRight([[1, 2]], -1, 1, 1, 0)).toThrow();
    expect(() => applyGivensRight([[1, 2]], 0, 5, 1, 0)).toThrow();
    expect(() => applyGivensRight([[1, 2]], 0, 0, 1, 0)).toThrow();
  });

  it('applyGivensRight zeroes A[row][k]', () => {
    const A = [[3, 4]];
    const { c, s } = givensRotation(A[0][0], A[0][1]);
    const out = applyGivensRight(A, 0, 1, c, s);
    expect(Math.abs(out[0][1])).toBeLessThan(1e-12);
  });

  it('preserves Frobenius norm', () => {
    const A = [
      [1, 2],
      [3, 4],
    ];
    const { c, s } = givensRotation(A[0][0], A[1][0]);
    const out = applyGivensLeft(A, 0, 1, c, s);
    let nA = 0;
    let nO = 0;
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) {
        nA += A[i][j] * A[i][j];
        nO += out[i][j] * out[i][j];
      }
    expect(nO).toBeCloseTo(nA, 8);
  });

  it('left/right composability', () => {
    const A = [
      [3, 0],
      [4, 0],
    ];
    const r = givensRotation(3, 4);
    const L = applyGivensLeft(A, 0, 1, r.c, r.s);
    expect(Math.abs(L[1][0])).toBeLessThan(1e-12);
    expect(Math.abs(L[0][0])).toBeCloseTo(5, 8);
  });

  it('handles negative entries', () => {
    const r = givensRotation(-3, -4);
    expect(r.c * r.c + r.s * r.s).toBeCloseTo(1, 12);
  });

  it('chain of rotations', () => {
    let A = [
      [1, 0, 0],
      [0, 3, 0],
      [0, 4, 0],
    ];
    const r = givensRotation(3, 4);
    A = applyGivensLeft(A, 1, 2, r.c, r.s);
    expect(Math.abs(A[2][1])).toBeLessThan(1e-12);
  });

  it('returns numeric c,s', () => {
    const r = givensRotation(5, 12);
    expect(typeof r.c).toBe('number');
    expect(typeof r.s).toBe('number');
  });
});
