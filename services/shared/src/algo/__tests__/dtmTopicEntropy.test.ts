import { describe, it, expect } from 'vitest';
import { computeDtmTopicEntropy } from '../dtmTopicEntropy';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

const N = DTM_TOPIC_KEYS.length;

describe('dtmTopicEntropy', () => {
  it('wrong-length vector -> zero result', () => {
    const r = computeDtmTopicEntropy(new Float32Array(5));
    expect(r).toEqual({ entropy: 0, normalized: 0, effectiveTopics: 1, activeCount: 0 });
  });

  it('zero vector -> zero entropy', () => {
    const r = computeDtmTopicEntropy(new Float32Array(N));
    expect(r.entropy).toBe(0);
    expect(r.normalized).toBe(0);
    expect(r.activeCount).toBe(0);
  });

  it('single-topic mass -> entropy 0', () => {
    const v = new Float32Array(N);
    v[3] = 1;
    const r = computeDtmTopicEntropy(v);
    expect(r.entropy).toBeCloseTo(0, 6);
    expect(r.normalized).toBeCloseTo(0, 6);
    expect(r.activeCount).toBe(1);
    expect(r.effectiveTopics).toBeCloseTo(1, 6);
  });

  it('uniform distribution -> normalized = 1', () => {
    const v = new Float32Array(N);
    for (let i = 0; i < N; i++) v[i] = 1;
    const r = computeDtmTopicEntropy(v);
    expect(r.normalized).toBeCloseTo(1, 6);
    expect(r.entropy).toBeCloseTo(Math.log(N), 6);
    expect(r.activeCount).toBe(N);
    expect(r.effectiveTopics).toBeCloseTo(N, 5);
  });

  it('two equal topics -> entropy = ln 2', () => {
    const v = new Float32Array(N);
    v[0] = 0.5;
    v[1] = 0.5;
    const r = computeDtmTopicEntropy(v);
    expect(r.entropy).toBeCloseTo(Math.log(2), 6);
    expect(r.effectiveTopics).toBeCloseTo(2, 5);
    expect(r.activeCount).toBe(2);
  });

  it('signs do not matter \u2014 uses |components|', () => {
    const a = new Float32Array(N);
    const b = new Float32Array(N);
    a[0] = 0.5; a[1] = 0.5;
    b[0] = -0.5; b[1] = 0.5;
    const ra = computeDtmTopicEntropy(a);
    const rb = computeDtmTopicEntropy(b);
    expect(rb.entropy).toBeCloseTo(ra.entropy, 6);
  });

  it('NaN components treated as 0', () => {
    const v = new Float32Array(N);
    v[0] = 0.5; v[1] = 0.5; v[2] = NaN;
    const r = computeDtmTopicEntropy(v);
    expect(r.entropy).toBeCloseTo(Math.log(2), 6);
    expect(r.activeCount).toBe(2);
  });

  it('normalized stays within [0,1]', () => {
    const v = new Float32Array(N);
    for (let i = 0; i < N; i++) v[i] = Math.random() + 0.001;
    const r = computeDtmTopicEntropy(v);
    expect(r.normalized).toBeGreaterThanOrEqual(0);
    expect(r.normalized).toBeLessThanOrEqual(1);
  });

  it('skewed dist has lower entropy than uniform', () => {
    const skew = new Float32Array(N);
    skew[0] = 10; skew[1] = 0.01; skew[2] = 0.01;
    const uni = new Float32Array(N).fill(1);
    expect(computeDtmTopicEntropy(skew).entropy).toBeLessThan(
      computeDtmTopicEntropy(uni).entropy,
    );
  });

  it('effectiveTopics ~ activeCount for uniform-over-active', () => {
    const v = new Float32Array(N);
    v[0] = v[1] = v[2] = v[3] = 1;
    const r = computeDtmTopicEntropy(v);
    expect(r.effectiveTopics).toBeCloseTo(4, 5);
  });
});
