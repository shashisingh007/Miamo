import { describe, it, expect } from 'vitest';
import { hampelFilter } from '../hampelFilter';

describe('hampelFilter', () => {
  it('throws on non-array', () => {
    expect(() => hampelFilter(null as any, 1)).toThrow();
  });

  it('throws on bad windowRadius', () => {
    expect(() => hampelFilter([1, 2, 3], 0)).toThrow();
    expect(() => hampelFilter([1, 2, 3], 1.5)).toThrow();
    expect(() => hampelFilter([1, 2, 3], -1)).toThrow();
  });

  it('throws on bad k', () => {
    expect(() => hampelFilter([1, 2, 3], 1, 0)).toThrow();
    expect(() => hampelFilter([1, 2, 3], 1, -1)).toThrow();
    expect(() => hampelFilter([1, 2, 3], 1, NaN)).toThrow();
  });

  it('throws on non-finite entry', () => {
    expect(() => hampelFilter([1, NaN], 1)).toThrow();
  });

  it('empty returns empty', () => {
    expect(hampelFilter([], 1)).toEqual([]);
  });

  it('constant series unchanged', () => {
    expect(hampelFilter([5, 5, 5, 5, 5], 1)).toEqual([5, 5, 5, 5, 5]);
  });

  it('isolated outlier replaced', () => {
    const x = [1, 1, 1, 1, 100, 1, 1, 1, 1];
    const out = hampelFilter(x, 2);
    expect(out[4]).toBe(1);
  });

  it('non-outliers preserved', () => {
    const x = [1, 1, 1, 1, 100, 1, 1, 1, 1];
    const out = hampelFilter(x, 2);
    for (let i = 0; i < x.length; i++) if (i !== 4) expect(out[i]).toBe(x[i]);
  });

  it('returns new array, no mutation', () => {
    const x = [1, 2, 3, 100, 4, 5];
    const ref = x.slice();
    const out = hampelFilter(x, 2);
    expect(x).toEqual(ref);
    expect(out).not.toBe(x);
  });

  it('preserves length', () => {
    expect(hampelFilter([1, 2, 3, 4, 5], 1)).toHaveLength(5);
  });

  it('large k => no replacement', () => {
    const x = [1, 2, 3, 4, 100, 4, 3, 2, 1];
    expect(hampelFilter(x, 2, 1000)).toEqual(x);
  });

  it('small k => more aggressive', () => {
    const x = [1, 1, 1, 1, 5, 1, 1, 1, 1];
    const out = hampelFilter(x, 2, 0.5);
    expect(out[4]).not.toBe(5);
  });

  it('handles edge windows', () => {
    const x = [100, 1, 1, 1, 1];
    const out = hampelFilter(x, 2);
    // Index 0 sees [100,1,1] -> median 1, MAD scaled, big deviation, replaced
    expect(out[0]).toBe(1);
  });

  it('zero MAD fallback: outlier replaced when window otherwise constant', () => {
    const x = [5, 5, 5, 100, 5, 5, 5];
    const out = hampelFilter(x, 1);
    // window for idx 3 is [5,100,5] -> median 5; MAD=0; fallback replaces.
    expect(out[3]).toBe(5);
  });
});
