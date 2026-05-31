import { describe, it, expect } from 'vitest';
import { canMakeSum, subsetSumWitness, countSubsetsWithSum } from '../subsetSumDp';

describe('subsetSumDp', () => {
  it('rejects non-array weights', () => {
    expect(() => canMakeSum('x' as any, 5)).toThrow(TypeError);
  });

  it('rejects negative weights', () => {
    expect(() => canMakeSum([-1, 2], 1)).toThrow(RangeError);
  });

  it('rejects non-integer target', () => {
    expect(() => canMakeSum([1, 2], 1.5)).toThrow(RangeError);
  });

  it('rejects negative target', () => {
    expect(() => canMakeSum([1], -1)).toThrow(RangeError);
  });

  it('empty weights makes 0 only', () => {
    expect(canMakeSum([], 0)).toBe(true);
    expect(canMakeSum([], 5)).toBe(false);
  });

  it('single element matches itself or 0', () => {
    expect(canMakeSum([5], 5)).toBe(true);
    expect(canMakeSum([5], 0)).toBe(true);
    expect(canMakeSum([5], 3)).toBe(false);
  });

  it('basic positive case', () => {
    expect(canMakeSum([3, 34, 4, 12, 5, 2], 9)).toBe(true);
    expect(canMakeSum([3, 34, 4, 12, 5, 2], 30)).toBe(false);
  });

  it('zeros are allowed', () => {
    expect(canMakeSum([0, 0, 5], 5)).toBe(true);
    expect(canMakeSum([0, 0, 0], 0)).toBe(true);
  });

  it('subsetSumWitness returns null when impossible', () => {
    expect(subsetSumWitness([3, 5], 4)).toBeNull();
  });

  it('subsetSumWitness returns valid indices', () => {
    const w = [3, 34, 4, 12, 5, 2];
    const ind = subsetSumWitness(w, 9);
    expect(ind).not.toBeNull();
    const total = ind!.reduce((s, i) => s + w[i], 0);
    expect(total).toBe(9);
  });

  it('subsetSumWitness target 0 returns []', () => {
    expect(subsetSumWitness([1, 2, 3], 0)).toEqual([]);
  });

  it('subsetSumWitness empty weights target 0', () => {
    expect(subsetSumWitness([], 0)).toEqual([]);
  });

  it('countSubsetsWithSum exact', () => {
    expect(countSubsetsWithSum([1, 2, 3], 3)).toBe(2); // {3}, {1,2}
    expect(countSubsetsWithSum([1, 1, 1], 2)).toBe(3); // three pairs by index
    expect(countSubsetsWithSum([1, 2, 3, 4, 5], 10)).toBe(3); // {1,4,5},{2,3,5},{1,2,3,4}
  });

  it('countSubsetsWithSum zero target counts empty subset', () => {
    expect(countSubsetsWithSum([1, 2, 3], 0)).toBe(1);
  });

  it('countSubsetsWithSum with zeros doubles', () => {
    // {0a},{0b},{0a,0b},{} all sum to 0
    expect(countSubsetsWithSum([0, 0], 0)).toBe(4);
  });

  it('weights > target ignored', () => {
    expect(canMakeSum([100, 200, 3], 3)).toBe(true);
    expect(countSubsetsWithSum([100, 200, 3], 3)).toBe(1);
  });

  it('large target zero', () => {
    expect(canMakeSum([1, 2, 3, 4, 5], 0)).toBe(true);
  });

  it('consistency: canMakeSum ⇔ countSubsetsWithSum > 0', () => {
    const w = [3, 7, 1, 5, 2, 8];
    for (let t = 0; t <= 20; t += 1) {
      expect(canMakeSum(w, t)).toBe(countSubsetsWithSum(w, t) > 0);
    }
  });

  it('witness indices are ascending', () => {
    const w = [1, 2, 3, 4, 5];
    const ind = subsetSumWitness(w, 7);
    expect(ind).not.toBeNull();
    for (let i = 1; i < ind!.length; i += 1) expect(ind![i] > ind![i - 1]).toBe(true);
  });
});
