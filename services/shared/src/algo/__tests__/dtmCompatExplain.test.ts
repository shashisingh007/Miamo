import { describe, it, expect } from 'vitest';
import { explainDtmCompat } from '../dtmCompatExplain';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

function vec(arr: number[]): Float32Array {
  const v = new Float32Array(16);
  for (let i = 0; i < 16; i++) v[i] = arr[i] ?? 0;
  return v;
}
const UNIFORM = (() => { const w = new Float32Array(16); for (let i = 0; i < 16; i++) w[i] = 1 / 16; return w; })();

describe('dtmCompatExplain', () => {
  it('identical vectors -> all supports', () => {
    const v = vec([0.5, 0.4, 0.3, 0.2, 0.1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const out = explainDtmCompat({ me: v, cand: v, weights: UNIFORM, topN: 5, minAbsScore: 0 });
    expect(out).toHaveLength(5);
    for (const o of out) expect(o.polarity).toBe('support');
  });

  it('fully opposite vectors -> all risks', () => {
    const me   = vec(Array(16).fill(1));
    const cand = vec(Array(16).fill(-1));
    const out = explainDtmCompat({ me, cand, weights: UNIFORM, topN: 5, minAbsScore: 0 });
    expect(out).toHaveLength(5);
    for (const o of out) expect(o.polarity).toBe('risk');
  });

  it('signed score is bounded by weight', () => {
    const v = vec([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const out = explainDtmCompat({ me: v, cand: v, weights: UNIFORM, topN: 1, minAbsScore: 0 });
    expect(out[0].score).toBeCloseTo(1 / 16, 6);
  });

  it('sorts by absolute score (strongest signal first)', () => {
    const w = new Float32Array(16);
    w[3] = 0.6; w[7] = 0.3; for (let i = 0; i < 16; i++) if (w[i] === 0) w[i] = 0.1 / 14;
    const me   = vec(Array(16).fill(0.2));
    const cand = vec(Array(16).fill(0.2));
    const out = explainDtmCompat({ me, cand, weights: w, topN: 2, minAbsScore: 0 });
    expect(out[0].topic).toBe(DTM_TOPIC_KEYS[3]);
    expect(out[1].topic).toBe(DTM_TOPIC_KEYS[7]);
  });

  it('honours topN cap', () => {
    const v = vec(Array(16).fill(0.1));
    const out = explainDtmCompat({ me: v, cand: v, weights: UNIFORM, topN: 2, minAbsScore: 0 });
    expect(out).toHaveLength(2);
  });

  it('filters by minAbsScore', () => {
    const me   = vec(Array(16).fill(0.5));
    const cand = vec(Array(16).fill(0.49));
    const out = explainDtmCompat({ me, cand, weights: UNIFORM, topN: 16, minAbsScore: 0.05 });
    // signed = (1/16) * (agreement*2 - 1); agreement \u2248 0.995 -> signed \u2248 (1/16)*0.99 \u2248 0.062
    expect(out.length).toBeGreaterThan(0);
    for (const o of out) expect(Math.abs(o.score)).toBeGreaterThanOrEqual(0.05);
  });

  it('returns mixed polarity for mixed inputs', () => {
    const me   = vec([1, -1, 1, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const cand = vec([1,  1, 1,  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const out = explainDtmCompat({ me, cand, weights: UNIFORM, topN: 16, minAbsScore: 0 });
    const polarities = new Set(out.map(o => o.polarity));
    expect(polarities.has('support')).toBe(true);
    expect(polarities.has('risk')).toBe(true);
  });

  it('tie-breaks by canonical topic index', () => {
    const v = vec(Array(16).fill(0.3));
    const out = explainDtmCompat({ me: v, cand: v, weights: UNIFORM, topN: 16, minAbsScore: 0 });
    for (let i = 0; i < out.length; i++) expect(out[i].topic).toBe(DTM_TOPIC_KEYS[i]);
  });
});
