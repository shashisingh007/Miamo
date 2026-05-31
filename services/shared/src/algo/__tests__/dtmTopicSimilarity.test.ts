import { describe, it, expect } from 'vitest';
import { computeDtmTopicSimilarity } from '../dtmTopicSimilarity';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

const N = DTM_TOPIC_KEYS.length;

function vec(map: Partial<Record<number, number>>): Float32Array {
  const v = new Float32Array(N);
  for (const [k, val] of Object.entries(map)) v[+k] = val!;
  return v;
}

describe('dtmTopicSimilarity', () => {
  it('identical unit vectors -> cosine 1', () => {
    const v = vec({ 0: 1 });
    const r = computeDtmTopicSimilarity(v, v);
    expect(r.cosine).toBeCloseTo(1, 6);
    expect(r.topContributions[0].topicKey).toBe(DTM_TOPIC_KEYS[0]);
  });

  it('orthogonal vectors -> cosine 0', () => {
    const a = vec({ 0: 1 });
    const b = vec({ 1: 1 });
    expect(computeDtmTopicSimilarity(a, b).cosine).toBe(0);
  });

  it('opposite signs -> negative cosine', () => {
    const a = vec({ 0: 1 });
    const b = vec({ 0: -1 });
    expect(computeDtmTopicSimilarity(a, b).cosine).toBe(-1);
  });

  it('returns top-N contributions sorted desc', () => {
    const a = vec({ 0: 0.6, 1: 0.5, 2: 0.4 });
    const b = vec({ 0: 0.6, 1: 0.5, 2: 0.4 });
    const r = computeDtmTopicSimilarity(a, b, 2);
    expect(r.topContributions).toHaveLength(2);
    expect(r.topContributions[0].contribution).toBeGreaterThan(r.topContributions[1].contribution);
  });

  it('returns empty when length mismatch', () => {
    const r = computeDtmTopicSimilarity(new Float32Array(5), new Float32Array(N));
    expect(r).toEqual({ cosine: 0, topContributions: [] });
  });

  it('handles non-finite entries safely', () => {
    const a = vec({ 0: 1 });
    const b = vec({ 0: 1 });
    (b as any)[1] = NaN;
    expect(computeDtmTopicSimilarity(a, b).cosine).toBe(1);
  });

  it('topN=0 returns no contributions but valid cosine', () => {
    const v = vec({ 0: 1 });
    const r = computeDtmTopicSimilarity(v, v, 0);
    expect(r.cosine).toBe(1);
    expect(r.topContributions).toEqual([]);
  });

  it('accepts plain number arrays', () => {
    const a = Array.from(vec({ 3: 1 }));
    const b = Array.from(vec({ 3: 1 }));
    expect(computeDtmTopicSimilarity(a, b).cosine).toBe(1);
  });

  it('contributions sum to cosine', () => {
    const a = vec({ 0: 0.6, 5: 0.8 });
    const b = vec({ 0: 0.5, 5: 0.5 });
    const r = computeDtmTopicSimilarity(a, b, N);
    const sum = r.topContributions.reduce((s, c) => s + c.contribution, 0);
    expect(sum).toBeCloseTo(r.cosine, 6);
  });
});
