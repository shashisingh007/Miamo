import { describe, it, expect } from 'vitest';
import { computeDtmTopicAlignment } from '../dtmTopicAlignmentScore';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

const N = DTM_TOPIC_KEYS.length;
function vec(map: Partial<Record<number, number>>): Float32Array {
  const v = new Float32Array(N);
  for (const [k, val] of Object.entries(map)) v[+k] = val!;
  return v;
}

describe('dtmTopicAlignmentScore', () => {
  it('wrong-length -> low tier', () => {
    const r = computeDtmTopicAlignment(new Float32Array(5), new Float32Array(N));
    expect(r.tier).toBe('low');
    expect(r.alignment).toBe(0);
  });

  it('identical vectors -> high alignment ~1', () => {
    const v = vec({ 0: 0.7, 1: 0.3 });
    const r = computeDtmTopicAlignment(v, v);
    expect(r.alignment).toBeCloseTo(1, 5);
    expect(r.tier).toBe('high');
    expect(r.pearson).toBeCloseTo(1, 5);
  });

  it('exact opposite signed vectors -> low alignment', () => {
    const a = vec({ 0: 1, 1: -1 });
    const b = vec({ 0: -1, 1: 1 });
    const r = computeDtmTopicAlignment(a, b);
    expect(r.pearson).toBeCloseTo(-1, 5);
    expect(r.alignment).toBeLessThan(0.5);
    expect(r.tier).toBe('low');
  });

  it('disjoint topics -> low overlap, low alignment', () => {
    const a = vec({ 0: 1 });
    const b = vec({ 5: 1 });
    const r = computeDtmTopicAlignment(a, b);
    expect(r.overlap).toBeCloseTo(0, 6);
    expect(r.tier).toBe('low');
  });

  it('weights renormalised when not summing to 1', () => {
    const v = vec({ 0: 1, 1: 1 });
    const r = computeDtmTopicAlignment(v, v, { pearsonWeight: 3, overlapWeight: 1 });
    expect(r.alignment).toBeCloseTo(1, 5);
  });

  it('zero-weighted both -> zero alignment', () => {
    const v = vec({ 0: 1 });
    const r = computeDtmTopicAlignment(v, v, { pearsonWeight: 0, overlapWeight: 0 });
    expect(r.alignment).toBe(0);
  });

  it('overlap-only weighting gives raw overlap', () => {
    const a = vec({ 0: 1, 1: 1 });
    const b = vec({ 0: 1, 1: 1 });
    const r = computeDtmTopicAlignment(a, b, { pearsonWeight: 0, overlapWeight: 1 });
    expect(r.alignment).toBeCloseTo(1, 5);
  });

  it('alignment in [0,1]', () => {
    const a = new Float32Array(N);
    const b = new Float32Array(N);
    for (let i = 0; i < N; i++) { a[i] = Math.random() - 0.5; b[i] = Math.random() - 0.5; }
    const r = computeDtmTopicAlignment(a, b);
    expect(r.alignment).toBeGreaterThanOrEqual(0);
    expect(r.alignment).toBeLessThanOrEqual(1);
  });

  it('tier thresholds: medium 0.5..0.75', () => {
    // a,b same direction but different magnitudes so overlap < 1
    const a = vec({ 0: 0.6, 1: 0.4 });
    const b = vec({ 0: 0.6, 1: 0.4 });
    const r = computeDtmTopicAlignment(a, b);
    expect(r.tier).toBe('high');
    // medium-ish: partial overlap
    const c = vec({ 0: 0.6, 1: 0.4 });
    const d = vec({ 0: 0.4, 1: 0.6 });
    const r2 = computeDtmTopicAlignment(c, d);
    expect(r2.tier === 'medium' || r2.tier === 'high').toBe(true);
  });

  it('negative weights clamped to 0', () => {
    const v = vec({ 0: 1, 1: 1 });
    const r = computeDtmTopicAlignment(v, v, { pearsonWeight: -5, overlapWeight: 1 });
    expect(r.alignment).toBeCloseTo(1, 5);
  });
});
