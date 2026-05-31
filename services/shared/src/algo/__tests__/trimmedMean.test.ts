import { describe, it, expect } from 'vitest';
import { trimmedMean } from '../trimmedMean';

describe('trimmedMean', () => {
  it('throws on non-array', () => {
    expect(() => trimmedMean(null as any, 0.1)).toThrow();
  });

  it('throws on empty', () => {
    expect(() => trimmedMean([], 0.1)).toThrow();
  });

  it('throws on bad alpha (negative)', () => {
    expect(() => trimmedMean([1, 2, 3], -0.1)).toThrow();
  });

  it('throws on bad alpha (>=0.5)', () => {
    expect(() => trimmedMean([1, 2, 3], 0.5)).toThrow();
  });

  it('throws on non-finite', () => {
    expect(() => trimmedMean([1, NaN], 0.1)).toThrow();
  });

  it('alpha=0 => regular mean', () => {
    expect(trimmedMean([1, 2, 3, 4, 5], 0)).toBeCloseTo(3, 9);
  });

  it('robust to outliers', () => {
    const v = [1, 2, 3, 4, 5, 6, 7, 8, 9, 1000];
    // floor(0.1*10)=1 => trim 1 from each side => mean of [2..9]
    expect(trimmedMean(v, 0.1)).toBeCloseTo(5.5, 9);
  });

  it('symmetric trimming', () => {
    const v = [-100, 1, 2, 3, 4, 5, 100];
    // floor(0.2*7)=1 => trim 1 each side => mean of [1,2,3,4,5]
    expect(trimmedMean(v, 0.2)).toBeCloseTo(3, 9);
  });

  it('order-independent', () => {
    expect(trimmedMean([5, 4, 3, 2, 1], 0)).toBeCloseTo(3, 9);
  });

  it('single value', () => {
    expect(trimmedMean([7], 0)).toBe(7);
  });

  it('does not mutate', () => {
    const v = [3, 1, 2];
    const ref = v.slice();
    trimmedMean(v, 0);
    expect(v).toEqual(ref);
  });

  it('large alpha trims aggressively', () => {
    const v = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    // floor(0.4*10)=4 => keep [5,6] => mean=5.5
    expect(trimmedMean(v, 0.4)).toBeCloseTo(5.5, 9);
  });

  it('all equal', () => {
    expect(trimmedMean([5, 5, 5, 5], 0.25)).toBe(5);
  });

  it('alpha=0 with negatives', () => {
    expect(trimmedMean([-2, -1, 0, 1, 2], 0)).toBeCloseTo(0, 9);
  });
});
