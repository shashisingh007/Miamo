import { describe, it, expect } from 'vitest';
import {
  emptyVarianceTracker,
  updateVariance,
  topicVariance,
  meanVariance,
} from '../dtmAnswerVarianceTracker';

describe('dtmAnswerVarianceTracker', () => {
  it('empty tracker reports 0 variance', () => {
    const t = emptyVarianceTracker();
    expect(topicVariance(t, 'values')).toBe(0);
    expect(meanVariance(t)).toBe(0);
  });

  it('single observation has 0 sample variance', () => {
    let t = emptyVarianceTracker();
    t = updateVariance(t, 'values', 0.5);
    expect(topicVariance(t, 'values')).toBe(0);
  });

  it('matches classical variance for known set', () => {
    let t = emptyVarianceTracker();
    [2, 4, 4, 4, 5, 5, 7, 9].forEach((v) => (t = updateVariance(t, 'family', v)));
    expect(topicVariance(t, 'family')).toBeCloseTo(4.571428, 4);
  });

  it('constant series -> 0 variance', () => {
    let t = emptyVarianceTracker();
    for (let i = 0; i < 5; i++) t = updateVariance(t, 'growth', 0.7);
    expect(topicVariance(t, 'growth')).toBe(0);
  });

  it('ignores invalid topic keys', () => {
    let t = emptyVarianceTracker();
    t = updateVariance(t, 'bogus' as any, 1);
    expect(t).toEqual({});
  });

  it('ignores non-finite values', () => {
    let t = emptyVarianceTracker();
    t = updateVariance(t, 'values', NaN);
    t = updateVariance(t, 'values', Infinity);
    expect(t.values).toBeUndefined();
  });

  it('meanVariance averages across topics with >=2 obs', () => {
    let t = emptyVarianceTracker();
    [1, 3].forEach((v) => (t = updateVariance(t, 'values', v))); // var=2
    [10, 14].forEach((v) => (t = updateVariance(t, 'family', v))); // var=8
    expect(meanVariance(t)).toBeCloseTo(5, 6);
  });

  it('immutable updates (returns new object)', () => {
    const t = emptyVarianceTracker();
    const t2 = updateVariance(t, 'values', 1);
    expect(t).toEqual({});
    expect(t2).not.toBe(t);
  });

  it('per-topic isolation', () => {
    let t = emptyVarianceTracker();
    t = updateVariance(t, 'values', 1);
    t = updateVariance(t, 'values', 5);
    t = updateVariance(t, 'family', 3);
    expect(topicVariance(t, 'values')).toBeGreaterThan(0);
    expect(topicVariance(t, 'family')).toBe(0);
  });
});
