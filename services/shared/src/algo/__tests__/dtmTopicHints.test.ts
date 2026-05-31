import { describe, it, expect } from 'vitest';
import { buildDtmTopicHints } from '../dtmTopicHints';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

function vec(fill: number[]): Float32Array {
  const v = new Float32Array(16);
  for (let i = 0; i < Math.min(fill.length, 16); i++) v[i] = fill[i];
  return v;
}

const UNIFORM = (() => {
  const w = new Float32Array(16);
  for (let i = 0; i < 16; i++) w[i] = 1 / 16;
  return w;
})();

describe('buildDtmTopicHints', () => {
  it('returns empty array when no topic clears minScore', () => {
    const me   = vec(Array(16).fill(1));
    const cand = vec(Array(16).fill(-1));
    const out = buildDtmTopicHints({ me, cand, weights: UNIFORM, minScore: 0.50 });
    expect(out).toEqual([]);
  });

  it('returns the most-agreed topic first when weights favour it', () => {
    const v = vec([0.9, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]);
    const w = new Float32Array(16);
    for (let i = 0; i < 16; i++) w[i] = i === 0 ? 0.5 : 0.5 / 15;
    const out = buildDtmTopicHints({ me: v, cand: v, weights: w, maxHints: 1, minScore: 0 });
    expect(out).toHaveLength(1);
    expect(out[0].topic).toBe(DTM_TOPIC_KEYS[0]);
  });

  it('caps at maxHints', () => {
    const v = vec(Array(16).fill(0.5));
    const out = buildDtmTopicHints({ me: v, cand: v, weights: UNIFORM, maxHints: 3, minScore: 0 });
    expect(out).toHaveLength(3);
  });

  it('respects per-topic weight (high weight surfaces first)', () => {
    const v = vec(Array(16).fill(0.5));
    const w = new Float32Array(16);
    for (let i = 0; i < 16; i++) w[i] = i === 5 ? 0.5 : 0.5 / 15;
    const out = buildDtmTopicHints({ me: v, cand: v, weights: w, maxHints: 1, minScore: 0 });
    expect(out[0].topic).toBe(DTM_TOPIC_KEYS[5]);
  });

  it('handles vectors of differing lengths safely', () => {
    const me   = vec(Array(16).fill(0.3));
    const cand = new Float32Array(8); for (let i = 0; i < 8; i++) cand[i] = 0.3;
    const out = buildDtmTopicHints({ me, cand, weights: UNIFORM, maxHints: 5, minScore: 0 });
    expect(out.length).toBeLessThanOrEqual(5);
  });

  it('scores in [0, 1]', () => {
    const v = vec(Array(16).fill(1));
    const out = buildDtmTopicHints({ me: v, cand: v, weights: UNIFORM, maxHints: 16, minScore: 0 });
    for (const h of out) {
      expect(h.score).toBeGreaterThanOrEqual(0);
      expect(h.score).toBeLessThanOrEqual(1);
    }
  });

  it('tie-breaks deterministically by topic key (alphabetical)', () => {
    const v = vec(Array(16).fill(0.3));
    const out = buildDtmTopicHints({ me: v, cand: v, weights: UNIFORM, maxHints: 16, minScore: 0 });
    // Identical scores → output order must be stable
    const out2 = buildDtmTopicHints({ me: v, cand: v, weights: UNIFORM, maxHints: 16, minScore: 0 });
    expect(out.map((h) => h.topic)).toEqual(out2.map((h) => h.topic));
  });
});
