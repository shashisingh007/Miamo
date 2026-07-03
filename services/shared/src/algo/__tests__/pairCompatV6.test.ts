import { describe, it, expect } from 'vitest';
import { scorePairV6, PAIR_V6_STATIC_WEIGHTS } from '../pairCompatV6';
import type { FeatureRow } from '../signals';

function vec(n: number, fn: (i: number) => number): Float32Array {
  const v = new Float32Array(n);
  for (let i = 0; i < n; i++) v[i] = fn(i);
  let s = 0; for (const x of v) s += x * x;
  const inv = s > 0 ? 1 / Math.sqrt(s) : 1;
  for (let i = 0; i < n; i++) v[i] *= inv;
  return v;
}

function feature(over: Partial<FeatureRow> = {}): FeatureRow {
  return {
    uidHash: 'h', chronotype: 'evening', attentionProfile: 'reader',
    rageClickRate: 0, deadClickRate: 0, swipeRightRatio: 0,
    replyPersonaP50Ms: null, responseRate: null,
    interestVec: vec(32, () => 0.5),
    vibeEmb: vec(64, () => 0.3),
    behaviorEmb: vec(64, () => 0.2),
    peakHours: null,
    ...over,
  };
}

describe('PAIR_V6_STATIC_WEIGHTS', () => {
  it('sums to exactly 1.0', () => {
    const s = Object.values(PAIR_V6_STATIC_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(s).toBeCloseTo(1, 5);
  });
});

describe('scorePairV6', () => {
  it('returns 0..1', () => {
    const out = scorePairV6({ a: feature(), b: feature(), aAge: 28, bAge: 28, cityKm: 5 });
    expect(out.v6Score).toBeGreaterThanOrEqual(0);
    expect(out.v6Score).toBeLessThanOrEqual(1);
  });

  it('identical feature pair scores ~1.0', () => {
    const out = scorePairV6({ a: feature(), b: feature(), aAge: 28, bAge: 28, cityKm: 0 });
    expect(out.v6Score).toBeGreaterThan(0.95);
  });

  it('opposite vectors + different age + far apart scores low', () => {
    const a = feature({
      interestVec: vec(32, (i) => (i < 16 ? 1 : 0)),
      vibeEmb: vec(64, () => 0.1),
      behaviorEmb: vec(64, () => 0.1),
      chronotype: 'morning',
    });
    const b = feature({
      interestVec: vec(32, (i) => (i < 16 ? 0 : 1)),
      vibeEmb: vec(64, () => -0.1),
      behaviorEmb: vec(64, () => -0.1),
      chronotype: 'evening',
    });
    const out = scorePairV6({ a, b, aAge: 20, bAge: 60, cityKm: 5000 });
    expect(out.v6Score).toBeLessThan(0.4);
  });

  it('returns 0.5 neutrals when both rows are null', () => {
    const out = scorePairV6({ a: null, b: null, aAge: null, bAge: null, cityKm: null });
    expect(out.v6Score).toBeCloseTo(0.5, 5);
    expect(out.breakdown.interestsOverlap).toBe(0.5);
    expect(out.breakdown.chronotypeOverlap).toBe(0.5);
  });

  it('breakdown matches recipe keys exactly', () => {
    const out = scorePairV6({ a: feature(), b: feature(), aAge: 28, bAge: 28, cityKm: 5 });
    expect(Object.keys(out.breakdown).sort()).toEqual(Object.keys(PAIR_V6_STATIC_WEIGHTS).sort());
  });

  it('higher cosine raises score monotonically', () => {
    const a = feature();
    const close = feature();
    const far = feature({
      interestVec: vec(32, (i) => (i < 16 ? 1 : 0)),
    });
    const closeScore = scorePairV6({ a, b: close, aAge: 28, bAge: 28, cityKm: 5 }).v6Score;
    const farScore = scorePairV6({ a, b: far, aAge: 28, bAge: 28, cityKm: 5 }).v6Score;
    expect(closeScore).toBeGreaterThanOrEqual(farScore);
  });
});
