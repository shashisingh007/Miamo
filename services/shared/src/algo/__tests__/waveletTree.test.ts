import { describe, it, expect } from 'vitest';
import { WaveletTree } from '../waveletTree';

describe('WaveletTree', () => {
  it('throws on sigma < 1', () => {
    expect(() => new WaveletTree([], 0)).toThrow(RangeError);
  });

  it('throws on value out of alphabet', () => {
    expect(() => new WaveletTree([0, 4], 4)).toThrow(RangeError);
  });

  it('throws on negative value', () => {
    expect(() => new WaveletTree([0, -1], 4)).toThrow(RangeError);
  });

  it('throws on non-integer value', () => {
    expect(() => new WaveletTree([0, 1.5], 4)).toThrow(RangeError);
  });

  it('size matches input length', () => {
    const w = new WaveletTree([0, 1, 2, 3], 4);
    expect(w.size).toBe(4);
  });

  it('empty input ok', () => {
    const w = new WaveletTree([], 4);
    expect(w.size).toBe(0);
    expect(w.rank(0, 0)).toBe(0);
  });

  it('access round-trips simple sequence', () => {
    const arr = [0, 1, 2, 3, 0, 1, 2, 3];
    const w = new WaveletTree(arr, 4);
    for (let i = 0; i < arr.length; i += 1) expect(w.access(i)).toBe(arr[i]);
  });

  it('access works on larger alphabet', () => {
    const arr = [7, 0, 3, 5, 1, 6, 2, 4];
    const w = new WaveletTree(arr, 8);
    for (let i = 0; i < arr.length; i += 1) expect(w.access(i)).toBe(arr[i]);
  });

  it('throws on out-of-range access', () => {
    const w = new WaveletTree([0, 1], 2);
    expect(() => w.access(-1)).toThrow(RangeError);
    expect(() => w.access(2)).toThrow(RangeError);
  });

  it('rank counts occurrences in prefix', () => {
    const arr = [0, 1, 2, 1, 0, 2, 1];
    const w = new WaveletTree(arr, 3);
    expect(w.rank(1, 7)).toBe(3);
    expect(w.rank(0, 7)).toBe(2);
    expect(w.rank(2, 7)).toBe(2);
  });

  it('rank prefix monotone', () => {
    const arr = [1, 1, 0, 1, 0, 0, 1];
    const w = new WaveletTree(arr, 2);
    let prev = 0;
    for (let i = 0; i <= arr.length; i += 1) {
      const r = w.rank(1, i);
      expect(r).toBeGreaterThanOrEqual(prev);
      prev = r;
    }
  });

  it('rank(_, 0) === 0', () => {
    const w = new WaveletTree([0, 1, 2, 3], 4);
    for (let s = 0; s < 4; s += 1) expect(w.rank(s, 0)).toBe(0);
  });

  it('rank total === total count', () => {
    const arr = [3, 1, 2, 3, 0, 3, 1];
    const w = new WaveletTree(arr, 4);
    expect(w.rank(3, 7)).toBe(3);
    expect(w.rank(0, 7)).toBe(1);
  });

  it('throws on out-of-range symbol', () => {
    const w = new WaveletTree([0, 1], 2);
    expect(() => w.rank(2, 2)).toThrow(RangeError);
  });

  it('throws on out-of-range endExclusive', () => {
    const w = new WaveletTree([0, 1], 2);
    expect(() => w.rank(0, 3)).toThrow(RangeError);
    expect(() => w.rank(0, -1)).toThrow(RangeError);
  });
});
