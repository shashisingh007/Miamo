import { describe, it, expect } from 'vitest';
import { softThresholdVector } from '../softThresholdVector';

describe('softThresholdVector', () => {
  it('throws on non-array', () => {
    expect(() => softThresholdVector(null as any, 1)).toThrow();
  });

  it('throws on negative lambda', () => {
    expect(() => softThresholdVector([1], -1)).toThrow();
  });

  it('throws on non-finite lambda', () => {
    expect(() => softThresholdVector([1], NaN)).toThrow();
    expect(() => softThresholdVector([1], Infinity)).toThrow();
  });

  it('throws on non-finite entry', () => {
    expect(() => softThresholdVector([1, NaN], 0.1)).toThrow();
  });

  it('lambda=0 acts identity', () => {
    expect(softThresholdVector([-3, -1, 0, 1, 3], 0)).toEqual([-3, -1, 0, 1, 3]);
  });

  it('zero vector stays zero', () => {
    expect(softThresholdVector([0, 0, 0], 1)).toEqual([0, 0, 0]);
  });

  it('shrinks positives', () => {
    expect(softThresholdVector([2, 5, 0.5], 1)).toEqual([1, 4, 0]);
  });

  it('shrinks negatives toward zero', () => {
    expect(softThresholdVector([-2, -5, -0.5], 1)).toEqual([-1, -4, 0]);
  });

  it('clamps to zero when |x| <= lambda', () => {
    expect(softThresholdVector([0.5, -0.5, 1, -1], 1)).toEqual([0, 0, 0, 0]);
  });

  it('preserves length', () => {
    expect(softThresholdVector([1, 2, 3, 4, 5], 0.5)).toHaveLength(5);
  });

  it('does not mutate input', () => {
    const x = [1, -2, 3];
    const ref = x.slice();
    softThresholdVector(x, 1);
    expect(x).toEqual(ref);
  });

  it('returns new array', () => {
    const x = [1, 2];
    const y = softThresholdVector(x, 0);
    expect(y).not.toBe(x);
  });

  it('idempotent at boundary', () => {
    // softT(softT(x, lam), lam) = softT(x, 2*lam)? not exactly; just confirm shrink-once
    const x = [3, -3];
    const y1 = softThresholdVector(x, 1);
    const y2 = softThresholdVector(y1, 1);
    expect(y1).toEqual([2, -2]);
    expect(y2).toEqual([1, -1]);
  });

  it('large lambda zeros everything', () => {
    expect(softThresholdVector([1, -2, 3, -4], 100)).toEqual([0, 0, 0, 0]);
  });

  it('handles empty array', () => {
    expect(softThresholdVector([], 1)).toEqual([]);
  });
});
