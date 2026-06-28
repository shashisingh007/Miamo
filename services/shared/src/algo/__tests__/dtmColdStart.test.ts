import { describe, it, expect } from 'vitest';
import { dtmColdStart } from '../dtmColdStart';
import { DTM_TOPIC_COUNT } from '../dtmTopics';

function vec(nonZeroIndices: number[]): Float32Array {
  const v = new Float32Array(DTM_TOPIC_COUNT);
  for (const i of nonZeroIndices) v[i] = 0.5;
  return v;
}

describe('dtmColdStart', () => {
  it('returns empty for null vector', () => {
    const r = dtmColdStart(null);
    expect(r.stage).toBe('empty');
    expect(r.coveredCount).toBe(0);
    expect(r.affinityWeight).toBe(0);
    expect(r.suggestedNextTopic).toBe('values');
    expect(r.uncoveredTopics).toHaveLength(16);
  });

  it('returns empty for zero-length vector', () => {
    expect(dtmColdStart(new Float32Array(0)).stage).toBe('empty');
  });

  it('returns empty when vector is all zeros', () => {
    const r = dtmColdStart(new Float32Array(16));
    expect(r.stage).toBe('empty');
    expect(r.coveredCount).toBe(0);
  });

  it('returns sparse when below default threshold (4)', () => {
    const r = dtmColdStart(vec([0, 1, 2]));
    expect(r.stage).toBe('sparse');
    expect(r.coveredCount).toBe(3);
    expect(r.affinityWeight).toBeCloseTo(0.25, 6);
  });

  it('returns sufficient between threshold and full', () => {
    const r = dtmColdStart(vec([0, 1, 2, 3, 4, 5, 6, 7]));
    expect(r.stage).toBe('sufficient');
    expect(r.coveredCount).toBe(8);
    expect(r.affinityWeight).toBeCloseTo(0.75, 6);
  });

  it('returns full when every topic is covered', () => {
    const r = dtmColdStart(vec([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]));
    expect(r.stage).toBe('full');
    expect(r.coveredCount).toBe(16);
    expect(r.affinityWeight).toBe(1.0);
    expect(r.uncoveredTopics).toHaveLength(0);
    expect(r.suggestedNextTopic).toBeNull();
  });

  it('suggestedNextTopic is the first uncovered topic', () => {
    const r = dtmColdStart(vec([0, 1, 2, 3, 4]));
    expect(r.suggestedNextTopic).toBe('finance'); // index 5
  });

  it('respects custom minTopicsForCompat', () => {
    const r = dtmColdStart(vec([0, 1, 2, 3, 4]), { minTopicsForCompat: 10 });
    expect(r.stage).toBe('sparse');
  });

  it('respects custom fullThreshold', () => {
    const r = dtmColdStart(vec([0,1,2,3,4,5,6,7,8,9,10,11]), { fullThreshold: 12 });
    expect(r.stage).toBe('full');
  });

  it('treats NaN/Infinity scalars as uncovered', () => {
    const v = new Float32Array(16);
    v[0] = NaN;
    v[1] = Infinity;
    v[2] = 0.5;
    const r = dtmColdStart(v);
    expect(r.coveredCount).toBe(1);
  });

  it('coverageRatio matches coveredCount / 16', () => {
    const r = dtmColdStart(vec([0, 1, 2, 3]));
    expect(r.coverageRatio).toBeCloseTo(4 / 16, 6);
  });
});
