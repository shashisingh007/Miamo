import { describe, it, expect } from 'vitest';
import {
  wassersteinDistance,
  wassersteinDistanceSamples,
} from '../wassersteinDistance';

describe('wassersteinDistance', () => {
  it('zero for identical', () => {
    expect(wassersteinDistance([0.5, 0.5], [0.5, 0.5])).toBeCloseTo(0, 12);
  });

  it('symmetric', () => {
    const a = wassersteinDistance([0.7, 0.2, 0.1], [0.1, 0.2, 0.7]);
    const b = wassersteinDistance([0.1, 0.2, 0.7], [0.7, 0.2, 0.1]);
    expect(a).toBeCloseTo(b, 12);
  });

  it('shifted distributions: cost = shift', () => {
    expect(wassersteinDistance([1, 0, 0, 0], [0, 0, 0, 1])).toBeCloseTo(3, 12);
  });

  it('one-step shift = 1', () => {
    expect(wassersteinDistance([1, 0], [0, 1])).toBeCloseTo(1, 12);
  });

  it('throws on length mismatch', () => {
    expect(() => wassersteinDistance([0.5, 0.5], [1])).toThrow();
  });

  it('throws on empty', () => {
    expect(() => wassersteinDistance([], [])).toThrow();
  });

  it('throws on negative', () => {
    expect(() => wassersteinDistance([-0.1, 1.1], [0.5, 0.5])).toThrow();
  });

  it('throws on non-finite', () => {
    expect(() => wassersteinDistance([NaN, 1], [0.5, 0.5])).toThrow();
  });

  it('throws on zero mass', () => {
    expect(() => wassersteinDistance([0, 0], [0.5, 0.5])).toThrow();
  });

  it('normalizes inputs', () => {
    const a = wassersteinDistance([7, 0, 3], [0, 5, 5]);
    const b = wassersteinDistance([0.7, 0, 0.3], [0, 0.5, 0.5]);
    expect(a).toBeCloseTo(b, 12);
  });

  it('samples: identical => 0', () => {
    expect(wassersteinDistanceSamples([1, 2, 3], [1, 2, 3])).toBeCloseTo(0, 12);
  });

  it('samples: shift by 1', () => {
    expect(wassersteinDistanceSamples([1, 2, 3], [2, 3, 4])).toBeCloseTo(1, 12);
  });

  it('samples: throws on empty', () => {
    expect(() => wassersteinDistanceSamples([], [])).toThrow();
  });

  it('samples: throws on length mismatch', () => {
    expect(() => wassersteinDistanceSamples([1, 2], [1])).toThrow();
  });

  it('samples: throws on non-finite', () => {
    expect(() => wassersteinDistanceSamples([1, NaN], [1, 2])).toThrow();
  });
});
