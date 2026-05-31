import { describe, it, expect } from 'vitest';
import { forwardSubstitute, backSubstitute } from '../triangularSubstitute';

describe('triangularSubstitute', () => {
  it('forwardSubstitute throws on empty', () => {
    expect(() => forwardSubstitute([], [])).toThrow();
  });

  it('forwardSubstitute throws on dim mismatch', () => {
    expect(() => forwardSubstitute([[1]], [1, 2])).toThrow();
  });

  it('forwardSubstitute throws on non-square', () => {
    expect(() => forwardSubstitute([[1, 2]] as any, [1])).toThrow();
  });

  it('forwardSubstitute throws on zero diagonal', () => {
    expect(() => forwardSubstitute([[0, 0], [1, 2]], [1, 2])).toThrow();
  });

  it('forwardSubstitute identity', () => {
    const x = forwardSubstitute([[1, 0], [0, 1]], [3, 4]);
    expect(x).toEqual([3, 4]);
  });

  it('forwardSubstitute simple', () => {
    const L = [[2, 0, 0], [1, 3, 0], [4, 1, 2]];
    const b = [4, 5, 13];
    const x = forwardSubstitute(L, b);
    // 2x0=4 -> x0=2; x0+3x1=5 -> x1=1; 4x0+x1+2x2=13 -> 8+1+2x2=13 -> x2=2
    expect(x[0]).toBeCloseTo(2, 12);
    expect(x[1]).toBeCloseTo(1, 12);
    expect(x[2]).toBeCloseTo(2, 12);
  });

  it('backSubstitute throws on empty', () => {
    expect(() => backSubstitute([], [])).toThrow();
  });

  it('backSubstitute throws on dim mismatch', () => {
    expect(() => backSubstitute([[1]], [1, 2])).toThrow();
  });

  it('backSubstitute throws on zero diagonal', () => {
    expect(() => backSubstitute([[1, 2], [0, 0]], [1, 2])).toThrow();
  });

  it('backSubstitute identity', () => {
    const x = backSubstitute([[1, 0], [0, 1]], [5, 6]);
    expect(x).toEqual([5, 6]);
  });

  it('backSubstitute simple', () => {
    const U = [[2, 1, 1], [0, 3, 2], [0, 0, 1]];
    const b = [5, 7, 1];
    const x = backSubstitute(U, b);
    // x2=1; 3x1+2=7 -> x1=5/3; 2x0 + 5/3 + 1 = 5 -> 2x0 = 5 - 5/3 - 1 = 7/3 -> x0=7/6
    expect(x[2]).toBeCloseTo(1, 12);
    expect(x[1]).toBeCloseTo(5 / 3, 10);
    expect(x[0]).toBeCloseTo(7 / 6, 10);
  });

  it('forwardSubstitute does not mutate', () => {
    const L = [[2, 0], [1, 2]];
    const b = [4, 6];
    const refL = JSON.parse(JSON.stringify(L));
    const refB = b.slice();
    forwardSubstitute(L, b);
    expect(L).toEqual(refL);
    expect(b).toEqual(refB);
  });

  it('backSubstitute does not mutate', () => {
    const U = [[2, 1], [0, 2]];
    const b = [4, 6];
    const refU = JSON.parse(JSON.stringify(U));
    const refB = b.slice();
    backSubstitute(U, b);
    expect(U).toEqual(refU);
    expect(b).toEqual(refB);
  });

  it('forward then back solves L (Lx=b) where L is identity matches b', () => {
    const I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const b = [1, 2, 3];
    expect(forwardSubstitute(I, b)).toEqual(b);
    expect(backSubstitute(I, b)).toEqual(b);
  });

  it('forwardSubstitute zero rhs', () => {
    const x = forwardSubstitute([[2, 0], [1, 3]], [0, 0]);
    expect(x).toEqual([0, 0]);
  });

  it('backSubstitute zero rhs', () => {
    const x = backSubstitute([[2, 1], [0, 3]], [0, 0]);
    expect(x).toEqual([0, 0]);
  });
});
