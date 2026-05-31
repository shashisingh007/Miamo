import { describe, it, expect } from 'vitest';
import { neumaierSummation } from '../neumaierSummation';

describe('neumaierSummation', () => {
  it('empty => 0', () => {
    expect(neumaierSummation([])).toBe(0);
  });

  it('single value', () => {
    expect(neumaierSummation([42])).toBe(42);
  });

  it('matches plain sum for ints', () => {
    expect(neumaierSummation([1, 2, 3, 4, 5])).toBe(15);
  });

  it('handles negatives', () => {
    expect(neumaierSummation([10, -3, -7])).toBe(0);
  });

  it('handles fractions', () => {
    expect(neumaierSummation([0.1, 0.2, 0.3])).toBeCloseTo(0.6, 15);
  });

  it('recovers cancellation: [1e16, 1, -1e16] = 1 exactly', () => {
    expect(neumaierSummation([1e16, 1, -1e16])).toBe(1);
  });

  it('beats naive on [1.0, 1e100, 1.0, -1e100]', () => {
    const arr = [1.0, 1e100, 1.0, -1e100];
    expect(neumaierSummation(arr)).toBe(2);
  });

  it('handles many 0.1s', () => {
    const arr: number[] = Array(1000).fill(0.1);
    expect(neumaierSummation(arr)).toBeCloseTo(100, 10);
  });

  it('accepts generator iterable', () => {
    function* g() { yield 1; yield 2; yield 3; }
    expect(neumaierSummation(g())).toBe(6);
  });

  it('throws on NaN', () => {
    expect(() => neumaierSummation([1, NaN])).toThrow(/non-finite/);
  });

  it('throws on Infinity', () => {
    expect(() => neumaierSummation([Infinity])).toThrow(/non-finite/);
  });
});
