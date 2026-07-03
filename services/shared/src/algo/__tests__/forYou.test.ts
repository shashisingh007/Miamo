import { describe, it, expect } from 'vitest';
import { scoreForYou, intentMatchScore, chronoOverlap, FORYOU_WEIGHTS } from '../forYou';
import type { FeatureRow, PairRow } from '../signals';

function vec(n: number, fn: (i: number) => number): Float32Array {
  const v = new Float32Array(n);
  for (let i = 0; i < n; i++) v[i] = fn(i);
  // l2-normalize
  let s = 0; for (const x of v) s += x*x;
  const inv = s > 0 ? 1/Math.sqrt(s) : 1;
  for (let i = 0; i < n; i++) v[i] *= inv;
  return v;
}

function feature(over: Partial<FeatureRow> = {}): FeatureRow {
  return {
    uidHash: 'h', chronotype: 'evening', attentionProfile: 'reader',
    rageClickRate: 0.01, deadClickRate: 0.01, swipeRightRatio: 0.4,
    replyPersonaP50Ms: 60000, responseRate: 0.7,
    interestVec: vec(32, () => 0.5), vibeEmb: vec(64, () => 0.3), behaviorEmb: vec(64, () => 0.2),
    peakHours: [20, 21, 22],
    ...over,
  };
}

describe('forYou cold path', () => {
  it('two identical users score very high', () => {
    const me = feature();
    const cand = feature();
    const { score, explain } = scoreForYou({
      me, cand,
      myIntent: 'serious', candIntent: 'serious',
      myAge: 28, candAge: 28,
      cityKm: 5,
      myInterests: ['hiking','jazz'], candInterests: ['hiking','jazz'],
      pair: undefined, priorCount: 0, impressionsLast48h: 0,
      consent: 'full',
    });
    expect(score).toBeGreaterThan(70);
    expect(explain.algo).toBe('forYou');
    expect(explain.cacheHit).toBe(false);
    expect(explain.consentScope).toBe('full');
    // every weighted signal contributed
    expect(explain.breakdown.interestCos).not.toBeNull();
    expect(explain.breakdown.behaviorCos).not.toBeNull();
  });

  it('cold-start candidate (no FeatureSnapshot) still scores via legacy fallback', () => {
    const me = feature();
    const { score, explain } = scoreForYou({
      me, cand: null,
      myIntent: 'casual', candIntent: 'casual',
      myAge: 25, candAge: 27,
      cityKm: 12,
      myInterests: ['art','wine'], candInterests: ['wine','jazz'],
      pair: undefined, priorCount: 0, impressionsLast48h: 0,
      consent: 'personalization-only',
    });
    expect(score).toBeGreaterThan(0);
    // dense-vector cosines should all be null (cand has no vectors)
    expect(explain.breakdown.vibeCos).toBeNull();
    expect(explain.breakdown.behaviorCos).toBeNull();
    // interest jaccard kicked in as substitute
    expect(explain.breakdown.interestCos).not.toBeNull();
  });

  it('fatigue penalty reduces score with repeated impressions', () => {
    const me = feature();
    const cand = feature();
    const args = {
      me, cand,
      myIntent: 'serious', candIntent: 'serious',
      myAge: 28, candAge: 28, cityKm: 5,
      myInterests: ['x'], candInterests: ['x'],
      pair: undefined, priorCount: 0,
      consent: 'full' as const,
    };
    const fresh = scoreForYou({ ...args, impressionsLast48h: 0 });
    const tired = scoreForYou({ ...args, impressionsLast48h: 20 });
    expect(tired.score).toBeLessThan(fresh.score);
  });

  it('cache hit short-circuits when fresh', () => {
    const pair: PairRow = {
      aHash: 'a', bHash: 'b',
      interestCos: 0.9, vibeCos: 0.8, behaviorCos: 0.7, magnetCos: 0.85,
      chronoOverlap: 1, cadenceOverlap: 0.5, priorInteractionScore: 0.3,
      finalScore: 0.85, computedAt: new Date(),
    };
    const me = feature();
    const cand = feature();
    const { score, explain } = scoreForYou({
      me, cand,
      myIntent: 'serious', candIntent: 'serious',
      myAge: 28, candAge: 28, cityKm: 5,
      myInterests: [], candInterests: [],
      pair, priorCount: 0, impressionsLast48h: 0,
      consent: 'full',
    });
    expect(explain.cacheHit).toBe(true);
    expect(score).toBeGreaterThan(80);
  });

  it('stale cache (>30min) falls through to cold path', () => {
    const pair: PairRow = {
      aHash: 'a', bHash: 'b',
      interestCos: 0.9, vibeCos: 0.8, behaviorCos: 0.7, magnetCos: 0.85,
      chronoOverlap: 1, cadenceOverlap: 0.5, priorInteractionScore: 0.3,
      finalScore: 0.85, computedAt: new Date(Date.now() - 60 * 60 * 1000),
    };
    const { explain } = scoreForYou({
      me: feature(), cand: feature(),
      myIntent: 'serious', candIntent: 'serious',
      myAge: 28, candAge: 28, cityKm: 5,
      myInterests: [], candInterests: [],
      pair, priorCount: 0, impressionsLast48h: 0,
      consent: 'full',
    });
    expect(explain.cacheHit).toBe(false);
  });
});

describe('helpers', () => {
  it('intentMatchScore: exact=1, adjacent=0.5, mismatch=0', () => {
    expect(intentMatchScore('serious', 'serious')).toBe(1);
    expect(intentMatchScore('serious', 'marriage')).toBe(0.5);
    expect(intentMatchScore('casual', 'marriage')).toBe(0);
  });
  it('chronoOverlap: same=1, mixed=0.6, disjoint=0.2, unknown=0.5', () => {
    expect(chronoOverlap('morning', 'morning')).toBe(1);
    expect(chronoOverlap('mixed', 'morning')).toBe(0.6);
    expect(chronoOverlap('morning', 'evening')).toBe(0.2);
    expect(chronoOverlap(null, 'morning')).toBe(0.5);
  });
  it('FORYOU_WEIGHTS sum to 1.0', () => {
    const s = Object.values(FORYOU_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(s).toBeCloseTo(1, 5);
  });
});
