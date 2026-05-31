import { describe, it, expect } from 'vitest';
import { winsorizedMean } from '../winsorizedMean';

describe('winsorizedMean', () => {
  it('throws on non-array', () => {
    expect(() => winsorizedMean(null as any, 0.1)).toThrow();
  });

  it('throws on empty', () => {
    expect(() => winsorizedMean([], 0.1)).toThrow();
  });

  it('throws on bad alpha (negative)', () => {
    expect(() => winsorizedMean([1, 2, 3], -0.1)).toThrow();
  });

  it('throws on bad alpha (>=0.5)', () => {
    expect(() => winsorizedMean([1, 2, 3], 0.5)).toThrow();
  });

  it('throws on non-finite', () => {
    expect(() => winsorizedMean([1, NaN], 0.1)).toThrow();
  });

  it('alpha=0 => regular mean', () => {
    expect(winsorizedMean([1, 2, 3, 4, 5], 0)).toBeCloseTo(3, 9);
  });

  it('clips outliers', () => {
    const v = [1, 2, 3, 4, 5, 6, 7, 8, 9, 1000];
    // floor(0.1*10)=1 => replace lowest with sorted[1]=2 and highest with sorted[8]=9
    // mean = (2+2+3+4+5+6+7+8+9+9)/10 = 55/10 = 5.5
    expect(winsorizedMean(v, 0.1)).toBeCloseTo(5.5, 9);
  });

  it('symmetric clipping', () => {
    const v = [-100, 1, 2, 3, 4, 5, 100];
    // floor(0.2*7)=1 => replace ends. sorted: [-100,1,2,3,4,5,100]; lo=1, hi=5
    // result: [1,1,2,3,4,5,5] mean=21/7=3
    expect(winsorizedMean(v, 0.2)).toBeCloseTo(3, 9);
  });

  it('order-independent', () => {
    expect(winsorizedMean([5, 4, 3, 2, 1], 0)).toBeCloseTo(3, 9);
  });

  it('single value', () => {
    expect(winsorizedMean([7], 0)).toBe(7);
  });

  it('does not mutate', () => {
    const v = [3, 1, 2];
    const ref = v.slice();
    winsorizedMean(v, 0);
    expect(v).toEqual(ref);
  });

  it('all equal => same value', () => {
    expect(winsorizedMean([5, 5, 5, 5], 0.25)).toBe(5);
  });

  it('alpha=0 with negatives', () => {
    expect(winsorizedMean([-2, -1, 0, 1, 2], 0)).toBeCloseTo(0, 9);
  });

  it('different from trimmed mean (n preserved)', () => {
    const v = [1, 2, 3, 4, 5, 6, 7, 8, 9, 100];
    // sum after winsor with alpha=0.1: lo=2 (replaces 1), hi=9 (replaces 100)
    // (2+2+3+4+5+6+7+8+9+9)/10 = 55/10 = 5.5
    expect(winsorizedMean(v, 0.1)).toBeCloseTo(5.5, 9);
  });

  it('alpha=0.4 heavy clipping', () => {
    const v = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    // floor(0.4*10)=4 => lo=sorted[4]=5, hi=sorted[5]=6
    // result: [5,5,5,5,5,6,6,6,6,6] mean=5.5
    expect(winsorizedMean(v, 0.4)).toBeCloseTo(5.5, 9);
  });
});
