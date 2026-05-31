import { describe, it, expect } from 'vitest';
import { kahanSummation } from '../kahanSummation';

describe('kahanSummation', () => {
  it('empty => 0', () => {
    expect(kahanSummation([])).toBe(0);
  });

  it('single value', () => {
    expect(kahanSummation([42])).toBe(42);
  });

  it('matches plain sum for ints', () => {
    expect(kahanSummation([1, 2, 3, 4, 5])).toBe(15);
  });

  it('handles negatives', () => {
    expect(kahanSummation([10, -3, -7])).toBe(0);
  });

  it('handles fractions', () => {
    expect(kahanSummation([0.1, 0.2, 0.3])).toBeCloseTo(0.6, 15);
  });

  it('more accurate than naive on many small additions', () => {
    const arr: number[] = [];
    for (let i = 0; i < 10000; i += 1) arr.push(0.1);
    let naive = 0;
    for (const v of arr) naive += v;
    const kahan = kahanSummation(arr);
    expect(Math.abs(kahan - 1000)).toBeLessThan(Math.abs(naive - 1000) + 1e-12);
    expect(kahan).toBeCloseTo(1000, 9);
  });

  it('handles many 0.1s precisely', () => {
    const arr: number[] = Array(1000).fill(0.1);
    expect(kahanSummation(arr)).toBeCloseTo(100, 10);
  });

  it('accepts generator iterable', () => {
    function* g() { yield 1; yield 2; yield 3; }
    expect(kahanSummation(g())).toBe(6);
  });

  it('throws on NaN', () => {
    expect(() => kahanSummation([1, NaN, 2])).toThrow(/non-finite/);
  });

  it('throws on Infinity', () => {
    expect(() => kahanSummation([1, Infinity])).toThrow(/non-finite/);
  });

  it('zero-only sums to zero', () => {
    expect(kahanSummation([0, 0, 0, -0])).toBe(0);
  });
});
