import { describe, it, expect } from 'vitest';
import { skewnessSample } from '../skewnessSample';

describe('skewnessSample', () => {
  it('throws on non-array', () => {
    expect(() => skewnessSample(null as any)).toThrow();
  });

  it('throws on too small', () => {
    expect(() => skewnessSample([])).toThrow();
    expect(() => skewnessSample([1])).toThrow();
  });

  it('throws on non-finite', () => {
    expect(() => skewnessSample([1, NaN])).toThrow();
  });

  it('all equal => 0', () => {
    expect(skewnessSample([5, 5, 5, 5])).toBe(0);
  });

  it('symmetric => ~0', () => {
    expect(skewnessSample([-2, -1, 0, 1, 2])).toBeCloseTo(0, 9);
  });

  it('right-skewed => positive', () => {
    expect(skewnessSample([1, 1, 1, 1, 100])).toBeGreaterThan(0);
  });

  it('left-skewed => negative', () => {
    expect(skewnessSample([-100, 1, 1, 1, 1])).toBeLessThan(0);
  });

  it('translation invariance', () => {
    const v = [1, 2, 4, 8, 16];
    const a = skewnessSample(v);
    const b = skewnessSample(v.map((x) => x + 1000));
    expect(a).toBeCloseTo(b, 9);
  });

  it('positive scale invariance', () => {
    const v = [1, 2, 4, 8, 16];
    const a = skewnessSample(v);
    const b = skewnessSample(v.map((x) => x * 7));
    expect(a).toBeCloseTo(b, 9);
  });

  it('negative scale flips sign', () => {
    const v = [1, 2, 4, 8, 16];
    const a = skewnessSample(v);
    const b = skewnessSample(v.map((x) => -x));
    expect(b).toBeCloseTo(-a, 9);
  });

  it('does not mutate', () => {
    const v = [3, 1, 2];
    const ref = v.slice();
    skewnessSample(v);
    expect(v).toEqual(ref);
  });

  it('finite output', () => {
    expect(Number.isFinite(skewnessSample([1, 2, 3, 4, 5]))).toBe(true);
  });

  it('two values: zero skew', () => {
    expect(skewnessSample([1, 5])).toBeCloseTo(0, 9);
  });
});
