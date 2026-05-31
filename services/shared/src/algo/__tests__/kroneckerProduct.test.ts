import { describe, it, expect } from 'vitest';
import { kroneckerProduct } from '../kroneckerProduct';

describe('kroneckerProduct', () => {
  it('throws on empty A', () => {
    expect(() => kroneckerProduct([], [[1]])).toThrow();
  });

  it('throws on empty B', () => {
    expect(() => kroneckerProduct([[1]], [])).toThrow();
  });

  it('throws on ragged A', () => {
    expect(() => kroneckerProduct([[1, 2], [3]] as any, [[1]])).toThrow();
  });

  it('throws on ragged B', () => {
    expect(() => kroneckerProduct([[1]], [[1, 2], [3]] as any)).toThrow();
  });

  it('1x1 ⊗ 1x1', () => {
    expect(kroneckerProduct([[3]], [[4]])).toEqual([[12]]);
  });

  it('2x2 ⊗ 2x2 dimensions', () => {
    const C = kroneckerProduct([[1, 2], [3, 4]], [[0, 5], [6, 7]]);
    expect(C.length).toBe(4);
    expect(C[0].length).toBe(4);
  });

  it('2x2 ⊗ 2x2 values', () => {
    const A = [[1, 2], [3, 4]];
    const B = [[0, 5], [6, 7]];
    const C = kroneckerProduct(A, B);
    expect(C).toEqual([
      [0, 5, 0, 10],
      [6, 7, 12, 14],
      [0, 15, 0, 20],
      [18, 21, 24, 28],
    ]);
  });

  it('I_n ⊗ I_m = I_{nm}', () => {
    const I2 = [[1, 0], [0, 1]];
    const I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const C = kroneckerProduct(I2, I3);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
      expect(C[i][j]).toBe(i === j ? 1 : 0);
    }
  });

  it('zero matrix produces zero', () => {
    const Z = [[0, 0], [0, 0]];
    const A = [[1, 2], [3, 4]];
    const C = kroneckerProduct(A, Z);
    for (const row of C) for (const v of row) expect(v).toBe(0);
  });

  it('rectangular A 2x3 ⊗ B 1x2 -> 2 x 6', () => {
    const A = [[1, 2, 3], [4, 5, 6]];
    const B = [[1, 1]];
    const C = kroneckerProduct(A, B);
    expect(C.length).toBe(2);
    expect(C[0].length).toBe(6);
    expect(C[0]).toEqual([1, 1, 2, 2, 3, 3]);
  });

  it('mixed-sized 1x2 ⊗ 2x1 = 2x2', () => {
    const A = [[1, 2]];
    const B = [[3], [4]];
    const C = kroneckerProduct(A, B);
    expect(C).toEqual([[3, 6], [4, 8]]);
  });

  it('does not mutate inputs', () => {
    const A = [[1, 2], [3, 4]];
    const B = [[0, 5], [6, 7]];
    const refA = JSON.parse(JSON.stringify(A));
    const refB = JSON.parse(JSON.stringify(B));
    kroneckerProduct(A, B);
    expect(A).toEqual(refA);
    expect(B).toEqual(refB);
  });

  it('associativity-like: dims of (A⊗B)⊗C equal A⊗(B⊗C)', () => {
    const A = [[1, 2]];
    const B = [[3], [4]];
    const C = [[5, 6]];
    const ab_c = kroneckerProduct(kroneckerProduct(A, B), C);
    const a_bc = kroneckerProduct(A, kroneckerProduct(B, C));
    expect(ab_c.length).toBe(a_bc.length);
    expect(ab_c[0].length).toBe(a_bc[0].length);
    for (let i = 0; i < ab_c.length; i++) for (let j = 0; j < ab_c[0].length; j++) {
      expect(ab_c[i][j]).toBe(a_bc[i][j]);
    }
  });

  it('handles negatives', () => {
    const C = kroneckerProduct([[-1]], [[1, -2]]);
    expect(C).toEqual([[-1, 2]]);
  });
});
