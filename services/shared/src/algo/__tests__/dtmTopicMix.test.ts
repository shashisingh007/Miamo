import { describe, it, expect } from 'vitest';
import { computeDtmTopicMix, topNTopicMix } from '../dtmTopicMix';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

const N = DTM_TOPIC_KEYS.length;

function vec(map: Partial<Record<number, number>>): Float32Array {
  const v = new Float32Array(N);
  for (const [k, val] of Object.entries(map)) v[+k] = val!;
  return v;
}

describe('dtmTopicMix', () => {
  it('zero vector -> all shares 0', () => {
    const out = computeDtmTopicMix(new Float32Array(N));
    expect(out.every((r) => r.share === 0)).toBe(true);
    expect(out).toHaveLength(N);
  });

  it('single-axis vector -> share 1 on that topic', () => {
    const out = computeDtmTopicMix(vec({ 0: 1 }));
    expect(out[0].topicKey).toBe(DTM_TOPIC_KEYS[0]);
    expect(out[0].share).toBe(1);
  });

  it('shares sum to 1 for non-zero vector', () => {
    const out = computeDtmTopicMix(vec({ 0: 0.5, 1: 0.5, 2: -0.5 }));
    const total = out.reduce((s, r) => s + r.share, 0);
    expect(total).toBeCloseTo(1, 6);
  });

  it('uses absolute value but keeps signed component', () => {
    const out = computeDtmTopicMix(vec({ 0: -0.7, 1: 0.3 }));
    const a = out.find((r) => r.topicKey === DTM_TOPIC_KEYS[0])!;
    expect(a.signed).toBeCloseTo(-0.7, 6);
    expect(a.share).toBeGreaterThan(0);
  });

  it('sorts descending by share', () => {
    const out = computeDtmTopicMix(vec({ 0: 0.2, 1: 0.8 }));
    expect(out[0].topicKey).toBe(DTM_TOPIC_KEYS[1]);
  });

  it('returns [] when length mismatch', () => {
    expect(computeDtmTopicMix(new Float32Array(5))).toEqual([]);
  });

  it('topN respects n', () => {
    const out = topNTopicMix(vec({ 0: 0.5, 1: 0.3, 2: 0.2 }), 2);
    expect(out).toHaveLength(2);
  });

  it('topN clamps negative n to 0', () => {
    expect(topNTopicMix(vec({ 0: 1 }), -3)).toEqual([]);
  });

  it('treats NaN components as 0', () => {
    const v = vec({ 0: 0.5 });
    (v as any)[1] = NaN;
    const out = computeDtmTopicMix(v);
    expect(out.find((r) => r.topicKey === DTM_TOPIC_KEYS[1])!.share).toBe(0);
  });

  it('accepts plain number array', () => {
    const out = computeDtmTopicMix(Array.from(vec({ 0: 1 })));
    expect(out[0].share).toBe(1);
  });
});
