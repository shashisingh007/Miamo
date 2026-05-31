import { describe, it, expect } from 'vitest';
import { giniCoefficient } from '../giniCoefficient';

describe('giniCoefficient', () => {
  it('throws on non-array', () => {
    expect(() => giniCoefficient(null as any)).toThrow();
  });

  it('throws on empty', () => {
    expect(() => giniCoefficient([])).toThrow();
  });

  it('throws on negative', () => {
    expect(() => giniCoefficient([1, -1])).toThrow();
  });

  it('throws on non-finite', () => {
    expect(() => giniCoefficient([1, NaN])).toThrow();
  });

  it('all equal => 0', () => {
    expect(giniCoefficient([5, 5, 5, 5])).toBeCloseTo(0, 9);
  });

  it('all zero => 0', () => {
    expect(giniCoefficient([0, 0, 0])).toBe(0);
  });

  it('single value => 0', () => {
    expect(giniCoefficient([42])).toBeCloseTo(0, 9);
  });

  it('maximum inequality (one has all)', () => {
    // [0,0,0,1] => Gini = (n-1)/n = 0.75
    expect(giniCoefficient([0, 0, 0, 1])).toBeCloseTo(0.75, 9);
  });

  it('order-independent', () => {
    const a = giniCoefficient([1, 2, 3, 4]);
    const b = giniCoefficient([4, 3, 2, 1]);
    expect(a).toBeCloseTo(b, 9);
  });

  it('range [0,1]', () => {
    const g = giniCoefficient([1, 2, 3, 100]);
    expect(g).toBeGreaterThan(0);
    expect(g).toBeLessThan(1);
  });

  it('two values: [1,3] => 0.25', () => {
    // sorted [1,3], sum=4, weighted=1*1+2*3=7, formula: 2*7/(2*4) - 3/2 = 7/4 - 1.5 = 0.25
    expect(giniCoefficient([1, 3])).toBeCloseTo(0.25, 9);
  });

  it('does not mutate input', () => {
    const v = [3, 1, 2];
    const ref = v.slice();
    giniCoefficient(v);
    expect(v).toEqual(ref);
  });

  it('scale invariance', () => {
    const a = giniCoefficient([1, 2, 3, 4]);
    const b = giniCoefficient([10, 20, 30, 40]);
    expect(a).toBeCloseTo(b, 9);
  });

  it('larger uniform distribution stays low', () => {
    expect(giniCoefficient(Array(50).fill(7))).toBeCloseTo(0, 9);
  });
});
