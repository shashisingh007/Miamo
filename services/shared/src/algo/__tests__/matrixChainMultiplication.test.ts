import { describe, it, expect } from 'vitest';
import { matrixChainMultiplication } from '../matrixChainMultiplication';

describe('matrixChainMultiplication', () => {
  it('rejects non-array', () => {
    expect(() => matrixChainMultiplication('x' as any)).toThrow(TypeError);
  });

  it('rejects non-positive dim', () => {
    expect(() => matrixChainMultiplication([1, 0, 2])).toThrow(RangeError);
    expect(() => matrixChainMultiplication([1, -1, 2])).toThrow(RangeError);
  });

  it('rejects non-integer dim', () => {
    expect(() => matrixChainMultiplication([1, 2.5, 3])).toThrow(RangeError);
  });

  it('rejects too few dims', () => {
    expect(() => matrixChainMultiplication([1])).toThrow(RangeError);
    expect(() => matrixChainMultiplication([])).toThrow(RangeError);
  });

  it('one matrix => cost 0', () => {
    expect(matrixChainMultiplication([3, 4])).toEqual({ minCost: 0, parenthesisation: 'A1' });
  });

  it('two matrices', () => {
    // 2x3 * 3x4 = 2*3*4 = 24
    const r = matrixChainMultiplication([2, 3, 4]);
    expect(r.minCost).toBe(24);
    expect(r.parenthesisation).toBe('(A1 A2)');
  });

  it('classic CLRS example: [30,35,15,5,10,20,25] => 15125', () => {
    const r = matrixChainMultiplication([30, 35, 15, 5, 10, 20, 25]);
    expect(r.minCost).toBe(15125);
  });

  it('classic small: [10, 30, 5, 60] => 4500', () => {
    // ((AB)C): (10x30)(30x5) cost 1500, then (10x5)(5x60) cost 3000 = 4500
    // (A(BC)): (30x5)(5x60) cost 9000, then (10x30)(30x60) cost 18000 = 27000
    const r = matrixChainMultiplication([10, 30, 5, 60]);
    expect(r.minCost).toBe(4500);
    expect(r.parenthesisation).toBe('((A1 A2) A3)');
  });

  it('three matrices', () => {
    // [4,10,3,12,20,7] -> classic answer 1344
    const r = matrixChainMultiplication([4, 10, 3, 12, 20, 7]);
    expect(r.minCost).toBe(1344);
  });

  it('square matrices', () => {
    // 3x3 * 3x3 * 3x3 = 27+27 = 54
    const r = matrixChainMultiplication([3, 3, 3, 3]);
    expect(r.minCost).toBe(54);
  });

  it('parenthesisation is well-formed', () => {
    const r = matrixChainMultiplication([5, 10, 3, 12, 5, 50, 6]);
    const open = (r.parenthesisation.match(/\(/g) || []).length;
    const close = (r.parenthesisation.match(/\)/g) || []).length;
    expect(open).toBe(close);
    // 6 matrices => 5 multiplications => 5 parens
    expect(open).toBe(5);
  });

  it('cost monotone with chain length', () => {
    const a = matrixChainMultiplication([2, 3, 4]).minCost;
    const b = matrixChainMultiplication([2, 3, 4, 5]).minCost;
    expect(b).toBeGreaterThan(a);
  });

  it('handles 10 matrices', () => {
    const dims = [40, 20, 30, 10, 30, 50, 60, 25, 45, 80, 10];
    const r = matrixChainMultiplication(dims);
    expect(r.minCost).toBeGreaterThan(0);
    expect(Number.isFinite(r.minCost)).toBe(true);
  });

  it('A1 used exactly once in parens for n=4', () => {
    const r = matrixChainMultiplication([10, 30, 5, 60, 10]);
    const matches = (r.parenthesisation.match(/A1\b/g) || []).length;
    expect(matches).toBe(1);
    expect(r.parenthesisation).toMatch(/A4/);
  });

  it('minCost equals brute force for small chain', () => {
    const dims = [5, 4, 6, 2, 7];
    const r = matrixChainMultiplication(dims);
    // brute force
    const n = dims.length - 1;
    const memo = new Map<string, number>();
    const solve = (i: number, j: number): number => {
      if (i === j) return 0;
      const key = `${i},${j}`;
      if (memo.has(key)) return memo.get(key)!;
      let best = Infinity;
      for (let k = i; k < j; k += 1) {
        const c = solve(i, k) + solve(k + 1, j) + dims[i] * dims[k + 1] * dims[j + 1];
        if (c < best) best = c;
      }
      memo.set(key, best);
      return best;
    };
    expect(r.minCost).toBe(solve(0, n - 1));
  });

  it('parenthesisation uses all matrices', () => {
    const r = matrixChainMultiplication([2, 3, 4, 5, 6]);
    for (let i = 1; i <= 4; i += 1) {
      expect(r.parenthesisation).toMatch(new RegExp(`A${i}\\b`));
    }
  });
});
