import { describe, it, expect } from 'vitest';
import { kurtosisExcess } from '../kurtosisExcess';

describe('kurtosisExcess', () => {
  it('throws on non-array', () => {
    expect(() => kurtosisExcess(null as any)).toThrow();
  });

  it('throws on too small', () => {
    expect(() => kurtosisExcess([1])).toThrow();
    expect(() => kurtosisExcess([])).toThrow();
  });

  it('throws on non-finite', () => {
    expect(() => kurtosisExcess([1, 2, NaN])).toThrow();
  });

  it('all equal => 0', () => {
    expect(kurtosisExcess([5, 5, 5, 5])).toBe(0);
  });

  it('two values: m4/m2^2 - 3 = 1 - 3 = -2', () => {
    expect(kurtosisExcess([1, 3])).toBeCloseTo(-2, 9);
  });

  it('uniform tends to negative excess', () => {
    const v: number[] = [];
    for (let i = 1; i <= 100; i++) v.push(i);
    expect(kurtosisExcess(v)).toBeLessThan(0);
  });

  it('heavy tail => positive excess', () => {
    const v = [-100, -1, 0, 0, 0, 0, 0, 1, 100];
    expect(kurtosisExcess(v)).toBeGreaterThan(0);
  });

  it('symmetric small sample', () => {
    // [-1, 0, 1]: mean=0, m2=2/3, m4=2/3; m4/m2^2 = (2/3)/(4/9) = 1.5; excess = -1.5
    expect(kurtosisExcess([-1, 0, 1])).toBeCloseTo(-1.5, 9);
  });

  it('translation invariance', () => {
    const v = [1, 2, 3, 4, 5];
    const a = kurtosisExcess(v);
    const b = kurtosisExcess(v.map((x) => x + 100));
    expect(a).toBeCloseTo(b, 9);
  });

  it('scale invariance', () => {
    const v = [1, 2, 3, 4, 5];
    const a = kurtosisExcess(v);
    const b = kurtosisExcess(v.map((x) => x * 7));
    expect(a).toBeCloseTo(b, 9);
  });

  it('does not mutate', () => {
    const v = [3, 1, 4, 1, 5];
    const ref = v.slice();
    kurtosisExcess(v);
    expect(v).toEqual(ref);
  });

  it('finite output', () => {
    expect(Number.isFinite(kurtosisExcess([1, 2, 3, 4]))).toBe(true);
  });

  it('handles negatives', () => {
    expect(Number.isFinite(kurtosisExcess([-3, -1, 0, 2, 4]))).toBe(true);
  });
});
