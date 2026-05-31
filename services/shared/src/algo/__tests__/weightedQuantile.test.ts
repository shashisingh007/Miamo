import { describe, it, expect } from 'vitest';
import { weightedQuantile } from '../weightedQuantile';

describe('weightedQuantile', () => {
  it('throws on empty', () => {
    expect(() => weightedQuantile([], [], 0.5)).toThrow();
  });

  it('throws on length mismatch', () => {
    expect(() => weightedQuantile([1], [], 0.5)).toThrow();
  });

  it('throws on q out of range', () => {
    expect(() => weightedQuantile([1], [1], -0.1)).toThrow();
    expect(() => weightedQuantile([1], [1], 1.1)).toThrow();
  });

  it('throws on negative weight', () => {
    expect(() => weightedQuantile([1, 2], [1, -1], 0.5)).toThrow();
  });

  it('throws on zero total weight', () => {
    expect(() => weightedQuantile([1, 2], [0, 0], 0.5)).toThrow();
  });

  it('q=0 returns minimum-with-weight', () => {
    expect(weightedQuantile([3, 1, 2], [1, 1, 1], 0)).toBeCloseTo(1, 8);
  });

  it('q=1 returns maximum', () => {
    expect(weightedQuantile([3, 1, 2], [1, 1, 1], 1)).toBeCloseTo(3, 8);
  });

  it('uniform weights == standard quantile', () => {
    // [1,2,3,4]; q=0.5; cumulative target=2 => element at cum>=2 is value 2 with linear interp
    // prevCum=1 (value 1), cum=2 (value 2), t=(2-1)/(2-1)=1 => returns 2
    expect(weightedQuantile([1, 2, 3, 4], [1, 1, 1, 1], 0.5)).toBeCloseTo(2, 8);
  });

  it('single element', () => {
    expect(weightedQuantile([7], [3], 0.5)).toBe(7);
  });

  it('weight concentrated', () => {
    // [1,5,9] weights [1,100,1] total 102 target 51
    // sorted cum: 1, 101, 102. Hits k=1 (value 5). prev=1, cur=101, t=50/100=0.5
    // Linear interp between values 1 and 5 at t=0.5 => 3
    expect(weightedQuantile([1, 5, 9], [1, 100, 1], 0.5)).toBeCloseTo(3, 6);
  });

  it('zero-weight entries skipped', () => {
    // [1,2,3] weights [1,0,1] total 2 target 1
    // sorted with weights skipped: items 0 (w=1) then 2 (w=1).
    // k=0: cum=1 >= 1, prev=0; t=1, returns values[0]=1.
    expect(weightedQuantile([1, 2, 3], [1, 0, 1], 0.5)).toBeCloseTo(1, 6);
  });

  it('handles unsorted input', () => {
    const v1 = weightedQuantile([3, 1, 2, 4], [1, 1, 1, 1], 0.75);
    const v2 = weightedQuantile([1, 2, 3, 4], [1, 1, 1, 1], 0.75);
    expect(v1).toBeCloseTo(v2, 8);
  });

  it('does not mutate inputs', () => {
    const v = [3, 1, 2];
    const w = [1, 1, 1];
    const vRef = v.slice();
    const wRef = w.slice();
    weightedQuantile(v, w, 0.5);
    expect(v).toEqual(vRef);
    expect(w).toEqual(wRef);
  });

  it('asymmetric weights skew', () => {
    // [1,5] weights [1,9] total 10; q=0.5 target=5; cum after 1 = 1, after 5 = 10
    // interpolate: prev=1, cur=10, t=(5-1)/(10-1)=4/9; result = 1 + 4/9*(5-1) = 1 + 16/9
    const expected = 1 + (4 / 9) * (5 - 1);
    expect(weightedQuantile([1, 5], [1, 9], 0.5)).toBeCloseTo(expected, 6);
  });

  it('q at boundary cumulative weight', () => {
    // Equal weights, q=0.25 with 4 items: target=1; cum after first=1 -> returns value 1
    expect(weightedQuantile([1, 2, 3, 4], [1, 1, 1, 1], 0.25)).toBeCloseTo(1, 6);
  });

  it('returns finite number for any valid input', () => {
    const r = weightedQuantile([10, 20, 30], [0.1, 0.5, 0.4], 0.7);
    expect(Number.isFinite(r)).toBe(true);
    expect(r).toBeGreaterThanOrEqual(10);
    expect(r).toBeLessThanOrEqual(30);
  });
});
