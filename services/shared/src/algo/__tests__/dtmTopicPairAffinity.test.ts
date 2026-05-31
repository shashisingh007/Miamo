import { describe, it, expect } from 'vitest';
import { computeDtmTopicPairAffinity } from '../dtmTopicPairAffinity';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

const N = DTM_TOPIC_KEYS.length;

function vec(map: Partial<Record<number, number>>): Float32Array {
  const v = new Float32Array(N);
  for (const [k, val] of Object.entries(map)) v[+k] = val!;
  return v;
}

describe('dtmTopicPairAffinity', () => {
  it('wrong-length vectors -> zero affinity, max jsd', () => {
    const r = computeDtmTopicPairAffinity(new Float32Array(5), new Float32Array(N));
    expect(r).toEqual({ shareCosine: 0, overlap: 0, jsd: 1 });
  });

  it('identical vectors -> cosine 1, overlap 1, jsd 0', () => {
    const v = vec({ 0: 0.7, 1: 0.3 });
    const r = computeDtmTopicPairAffinity(v, v);
    expect(r.shareCosine).toBeCloseTo(1, 6);
    expect(r.overlap).toBeCloseTo(1, 6);
    expect(r.jsd).toBeCloseTo(0, 6);
  });

  it('disjoint topics -> cosine 0, overlap 0, jsd 1', () => {
    const a = vec({ 0: 1 });
    const b = vec({ 5: 1 });
    const r = computeDtmTopicPairAffinity(a, b);
    expect(r.shareCosine).toBeCloseTo(0, 6);
    expect(r.overlap).toBeCloseTo(0, 6);
    expect(r.jsd).toBeCloseTo(1, 6);
  });

  it('sign-invariant (uses |components|)', () => {
    const a = vec({ 0: 0.5, 1: -0.5 });
    const b = vec({ 0: -0.5, 1: 0.5 });
    const r = computeDtmTopicPairAffinity(a, b);
    expect(r.shareCosine).toBeCloseTo(1, 6);
    expect(r.overlap).toBeCloseTo(1, 6);
  });

  it('zero vector on either side -> zero affinity', () => {
    const a = new Float32Array(N);
    const b = vec({ 0: 1 });
    const r = computeDtmTopicPairAffinity(a, b);
    expect(r.shareCosine).toBe(0);
    expect(r.overlap).toBe(0);
    expect(r.jsd).toBe(1);
  });

  it('half-overlap pair', () => {
    const a = vec({ 0: 1, 1: 1 }); // shares 0.5,0.5
    const b = vec({ 1: 1, 2: 1 }); // shares 0.5,0.5 on different topic pair
    const r = computeDtmTopicPairAffinity(a, b);
    expect(r.overlap).toBeCloseTo(0.5, 6); // only topic 1 overlaps at 0.5
    expect(r.shareCosine).toBeCloseTo(0.5, 6);
    expect(r.jsd).toBeGreaterThan(0);
    expect(r.jsd).toBeLessThan(1);
  });

  it('NaN components treated as 0', () => {
    const a = vec({ 0: 0.5, 1: 0.5 });
    const b = vec({ 0: 0.5, 1: 0.5 });
    (b as any)[2] = NaN;
    const r = computeDtmTopicPairAffinity(a, b);
    expect(r.shareCosine).toBeCloseTo(1, 6);
  });

  it('magnitude-invariant (ratios are what matter)', () => {
    const a = vec({ 0: 0.7, 1: 0.3 });
    const b = vec({ 0: 70, 1: 30 });
    const r = computeDtmTopicPairAffinity(a, b);
    expect(r.shareCosine).toBeCloseTo(1, 6);
  });

  it('all metrics stay in [0,1]', () => {
    const a = new Float32Array(N);
    const b = new Float32Array(N);
    for (let i = 0; i < N; i++) { a[i] = Math.random(); b[i] = Math.random(); }
    const r = computeDtmTopicPairAffinity(a, b);
    expect(r.shareCosine).toBeGreaterThanOrEqual(0);
    expect(r.shareCosine).toBeLessThanOrEqual(1);
    expect(r.overlap).toBeGreaterThanOrEqual(0);
    expect(r.overlap).toBeLessThanOrEqual(1);
    expect(r.jsd).toBeGreaterThanOrEqual(0);
    expect(r.jsd).toBeLessThanOrEqual(1);
  });
});
