import { describe, it, expect } from 'vitest';
import { computeDtmTopicSkew } from '../dtmTopicSkew';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

const N = DTM_TOPIC_KEYS.length;

describe('dtmTopicSkew', () => {
  it('wrong-length -> zero result', () => {
    expect(computeDtmTopicSkew(new Float32Array(5))).toEqual({
      topShare: 0, top3Share: 0, hhi: 0, gini: 0,
    });
  });

  it('zero vector -> zero result', () => {
    expect(computeDtmTopicSkew(new Float32Array(N))).toEqual({
      topShare: 0, top3Share: 0, hhi: 0, gini: 0,
    });
  });

  it('single-topic mass -> max concentration', () => {
    const v = new Float32Array(N); v[0] = 1;
    const r = computeDtmTopicSkew(v);
    expect(r.topShare).toBeCloseTo(1, 6);
    expect(r.top3Share).toBeCloseTo(1, 6);
    expect(r.hhi).toBeCloseTo(1, 6);
    expect(r.gini).toBeCloseTo((N - 1) / N, 6);
  });

  it('uniform distribution -> minimum concentration', () => {
    const v = new Float32Array(N).fill(1);
    const r = computeDtmTopicSkew(v);
    expect(r.topShare).toBeCloseTo(1 / N, 6);
    expect(r.top3Share).toBeCloseTo(3 / N, 6);
    expect(r.hhi).toBeCloseTo(1 / N, 6);
    expect(r.gini).toBeCloseTo(0, 6);
  });

  it('sign-invariant', () => {
    const a = new Float32Array(N); a[0] = 0.5; a[1] = 0.5;
    const b = new Float32Array(N); b[0] = -0.5; b[1] = 0.5;
    const ra = computeDtmTopicSkew(a);
    const rb = computeDtmTopicSkew(b);
    expect(rb.topShare).toBeCloseTo(ra.topShare, 6);
    expect(rb.gini).toBeCloseTo(ra.gini, 6);
  });

  it('NaN components treated as 0', () => {
    const v = new Float32Array(N); v[0] = 1; (v as any)[1] = NaN;
    const r = computeDtmTopicSkew(v);
    expect(r.topShare).toBeCloseTo(1, 6);
  });

  it('top3Share clamped at 1', () => {
    const v = new Float32Array(N); v[0] = 0.5; v[1] = 0.3; v[2] = 0.2;
    const r = computeDtmTopicSkew(v);
    expect(r.top3Share).toBeCloseTo(1, 6);
  });

  it('all metrics in [0,1]', () => {
    const v = new Float32Array(N);
    for (let i = 0; i < N; i++) v[i] = Math.random();
    const r = computeDtmTopicSkew(v);
    for (const k of ['topShare', 'top3Share', 'hhi', 'gini'] as const) {
      expect(r[k]).toBeGreaterThanOrEqual(0);
      expect(r[k]).toBeLessThanOrEqual(1);
    }
  });

  it('skewed > uniform on HHI', () => {
    const skew = new Float32Array(N); skew[0] = 5; skew[1] = 0.1;
    const uni = new Float32Array(N).fill(1);
    expect(computeDtmTopicSkew(skew).hhi).toBeGreaterThan(
      computeDtmTopicSkew(uni).hhi,
    );
  });

  it('two-equal-topics gini matches analytic', () => {
    const v = new Float32Array(N); v[0] = 1; v[1] = 1;
    const r = computeDtmTopicSkew(v);
    // two shares of 0.5, rest 0 \u2014 gini = 1 - 2/N
    expect(r.gini).toBeCloseTo(1 - 2 / N, 6);
  });
});
