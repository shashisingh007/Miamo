import { describe, it, expect } from 'vitest';
import {
  zeckendorfDecompose,
  zeckendorfReconstruct,
  zeckendorfRepresentation,
} from '../zeckendorfRepresentation';

describe('zeckendorfRepresentation', () => {
  it('factory exposes both', () => {
    const api = zeckendorfRepresentation();
    expect(typeof api.zeckendorfDecompose).toBe('function');
    expect(typeof api.zeckendorfReconstruct).toBe('function');
  });

  it('0 => []', () => {
    expect(zeckendorfDecompose(0)).toEqual([]);
  });

  it('1 => [1]', () => {
    expect(zeckendorfDecompose(1)).toEqual([1]);
  });

  it('100 = 89+8+3', () => {
    expect(zeckendorfDecompose(100)).toEqual([89, 8, 3]);
  });

  it('parts are non-consecutive Fibonacci numbers', () => {
    for (const n of [10, 50, 200, 999]) {
      const parts = zeckendorfDecompose(n);
      // strictly decreasing
      for (let i = 1; i < parts.length; i += 1) expect(parts[i]).toBeLessThan(parts[i - 1]);
      // no two consecutive Fibonacci numbers (ratio ~1.618)
      for (let i = 1; i < parts.length; i += 1) {
        // consecutive Fibs have ratio < 1.7 roughly; non-consecutive ratio >= ~2.6
        expect(parts[i - 1] / parts[i]).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('reconstruct sums back to n', () => {
    for (const n of [1, 7, 42, 123, 1000, 10000]) {
      expect(zeckendorfReconstruct(zeckendorfDecompose(n))).toBe(n);
    }
  });

  it('reconstruct empty => 0', () => {
    expect(zeckendorfReconstruct([])).toBe(0);
  });

  it('throws on bad input', () => {
    expect(() => zeckendorfDecompose(-1)).toThrow();
    expect(() => zeckendorfDecompose(1.5)).toThrow();
    expect(() => zeckendorfReconstruct(null as any)).toThrow();
    expect(() => zeckendorfReconstruct([0])).toThrow();
    expect(() => zeckendorfReconstruct([-1])).toThrow();
  });

  it('uniqueness up to N: each n has same decomposition twice', () => {
    for (let n = 1; n <= 50; n += 1) {
      expect(zeckendorfDecompose(n)).toEqual(zeckendorfDecompose(n));
    }
  });

  it('all parts are valid Fibonacci numbers', () => {
    const fibs = new Set([1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584]);
    const parts = zeckendorfDecompose(2500);
    for (const p of parts) expect(fibs.has(p)).toBe(true);
  });
});
