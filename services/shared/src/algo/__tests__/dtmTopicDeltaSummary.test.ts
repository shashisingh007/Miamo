import { describe, it, expect } from 'vitest';
import { computeDtmTopicDeltaSummary } from '../dtmTopicDeltaSummary';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

const N = DTM_TOPIC_KEYS.length;

describe('dtmTopicDeltaSummary', () => {
  it('wrong-length -> empty', () => {
    const r = computeDtmTopicDeltaSummary(new Float32Array(5), new Float32Array(N));
    expect(r).toEqual({ deltas: [], topUp: [], topDown: [], totalAbsChange: 0 });
  });

  it('identical vectors -> zero deltas', () => {
    const v = new Float32Array(N); v[0] = 0.5;
    const r = computeDtmTopicDeltaSummary(v, v);
    expect(r.totalAbsChange).toBe(0);
    expect(r.topUp).toEqual([]);
    expect(r.topDown).toEqual([]);
    expect(r.deltas.length).toBe(N);
  });

  it('captures top up movers', () => {
    const b = new Float32Array(N);
    const a = new Float32Array(N);
    a[0] = 0.8;  // big up on values
    a[3] = 0.5;  // up on intimacy
    const r = computeDtmTopicDeltaSummary(b, a, 2);
    expect(r.topUp.length).toBe(2);
    expect(r.topUp[0].topicKey).toBe(DTM_TOPIC_KEYS[0]);
    expect(r.topUp[0].delta).toBeCloseTo(0.8, 6);
    expect(r.topUp[1].topicKey).toBe(DTM_TOPIC_KEYS[3]);
  });

  it('captures top down movers', () => {
    const b = new Float32Array(N); b[1] = 0.9; b[2] = 0.4;
    const a = new Float32Array(N);
    const r = computeDtmTopicDeltaSummary(b, a, 2);
    expect(r.topDown[0].topicKey).toBe(DTM_TOPIC_KEYS[1]);
    expect(r.topDown[0].delta).toBeCloseTo(-0.9, 6);
  });

  it('totalAbsChange sums |\u0394|', () => {
    const b = new Float32Array(N); b[0] = 0.5;
    const a = new Float32Array(N); a[0] = 0.2; a[1] = 0.3;
    const r = computeDtmTopicDeltaSummary(b, a);
    expect(r.totalAbsChange).toBeCloseTo(0.3 + 0.3, 6);
  });

  it('topN respected (default 3)', () => {
    const b = new Float32Array(N);
    const a = new Float32Array(N);
    for (let i = 0; i < N; i++) a[i] = i * 0.01;
    const r = computeDtmTopicDeltaSummary(b, a);
    expect(r.topUp.length).toBe(3);
    expect(r.topUp[0].topicKey).toBe(DTM_TOPIC_KEYS[N - 1]);
  });

  it('topN floor = 1', () => {
    const b = new Float32Array(N);
    const a = new Float32Array(N); a[0] = 0.5; a[1] = 0.3;
    const r = computeDtmTopicDeltaSummary(b, a, 0);
    expect(r.topUp.length).toBe(1);
  });

  it('deltas preserve full N entries even when zero', () => {
    const b = new Float32Array(N); b[0] = 0.1;
    const a = new Float32Array(N); a[0] = 0.1;
    const r = computeDtmTopicDeltaSummary(b, a);
    expect(r.deltas.length).toBe(N);
    expect(r.deltas.every((d) => d.delta === 0)).toBe(true);
  });

  it('NaN components treated as 0', () => {
    const b = new Float32Array(N);
    const a = new Float32Array(N); a[0] = 0.5;
    (a as any)[1] = NaN;
    const r = computeDtmTopicDeltaSummary(b, a);
    expect(r.topUp[0].topicKey).toBe(DTM_TOPIC_KEYS[0]);
  });

  it('mixed up + down preserved', () => {
    const b = new Float32Array(N); b[0] = 0.5; b[1] = 0.2;
    const a = new Float32Array(N); a[0] = 0.1; a[2] = 0.6;
    const r = computeDtmTopicDeltaSummary(b, a);
    // delta[0] = -0.4 (largest drop), delta[1] = -0.2, delta[2] = +0.6
    expect(r.topDown[0].topicKey).toBe(DTM_TOPIC_KEYS[0]);
    expect(r.topUp[0].topicKey).toBe(DTM_TOPIC_KEYS[2]);
  });
});
