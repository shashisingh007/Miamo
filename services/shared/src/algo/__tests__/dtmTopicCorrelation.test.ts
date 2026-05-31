import { describe, it, expect } from 'vitest';
import { computeDtmTopicCorrelation } from '../dtmTopicCorrelation';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

const N = DTM_TOPIC_KEYS.length;

function rand(): Float32Array {
  const v = new Float32Array(N);
  for (let i = 0; i < N; i++) v[i] = Math.random() - 0.5;
  return v;
}

describe('dtmTopicCorrelation', () => {
  it('wrong-length vectors -> zero', () => {
    expect(computeDtmTopicCorrelation(new Float32Array(5), new Float32Array(N))).toEqual({
      correlation: 0, strength: 0, direction: 0,
    });
  });

  it('identical vector with variance -> correlation 1', () => {
    const v = rand();
    const r = computeDtmTopicCorrelation(v, v);
    expect(r.correlation).toBeCloseTo(1, 6);
    expect(r.direction).toBe(1);
    expect(r.strength).toBeCloseTo(1, 6);
  });

  it('exact opposite -> correlation -1', () => {
    const v = rand();
    const neg = new Float32Array(N);
    for (let i = 0; i < N; i++) neg[i] = -v[i];
    const r = computeDtmTopicCorrelation(v, neg);
    expect(r.correlation).toBeCloseTo(-1, 6);
    expect(r.direction).toBe(-1);
  });

  it('constant vector on either side -> 0', () => {
    const c = new Float32Array(N).fill(0.3);
    const v = rand();
    expect(computeDtmTopicCorrelation(c, v).correlation).toBe(0);
    expect(computeDtmTopicCorrelation(v, c).correlation).toBe(0);
  });

  it('zero vectors -> 0', () => {
    const z = new Float32Array(N);
    expect(computeDtmTopicCorrelation(z, z).correlation).toBe(0);
  });

  it('linear scaling preserves correlation', () => {
    const v = rand();
    const scaled = new Float32Array(N);
    for (let i = 0; i < N; i++) scaled[i] = v[i] * 5 + 0.2;
    const r = computeDtmTopicCorrelation(v, scaled);
    expect(r.correlation).toBeCloseTo(1, 5);
  });

  it('NaN components treated as 0', () => {
    const a = rand();
    const b = new Float32Array(N);
    for (let i = 0; i < N; i++) b[i] = a[i];
    (b as any)[2] = NaN;
    const r = computeDtmTopicCorrelation(a, b);
    expect(r.correlation).toBeGreaterThan(0.5);
  });

  it('partial overlap -> intermediate magnitude', () => {
    const a = new Float32Array(N);
    const b = new Float32Array(N);
    a[0] = 1; a[1] = 1; a[2] = -1;
    b[0] = 1; b[1] = -1; b[2] = 1;
    const r = computeDtmTopicCorrelation(a, b);
    expect(r.strength).toBeLessThan(1);
    expect(r.strength).toBeGreaterThan(0);
  });

  it('result is clamped to [-1, 1]', () => {
    const a = rand();
    const b = rand();
    const r = computeDtmTopicCorrelation(a, b);
    expect(r.correlation).toBeLessThanOrEqual(1);
    expect(r.correlation).toBeGreaterThanOrEqual(-1);
  });

  it('symmetric: corr(a,b) === corr(b,a)', () => {
    const a = rand();
    const b = rand();
    const r1 = computeDtmTopicCorrelation(a, b);
    const r2 = computeDtmTopicCorrelation(b, a);
    expect(r1.correlation).toBeCloseTo(r2.correlation, 10);
  });
});
