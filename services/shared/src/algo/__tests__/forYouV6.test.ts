import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  scoreForYouV6, reciprocalIntentScore, communicationCadenceFit, moveStyleCompat,
  FORYOU_V6_WEIGHTS, FORYOU_V6_PENALTIES,
} from '../forYouV6';
import { scoreForYou } from '../forYou';
import type { FeatureRow, PairRow, PairBehavior, SessionSummaryRow } from '../signals';

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
    rageClickRate: 0.01, deadClickRate: 0.01, swipeRightRatio: 0.4,
    replyPersonaP50Ms: 60_000, responseRate: 0.7,
    interestVec: vec(32, () => 0.5), vibeEmb: vec(64, () => 0.3), behaviorEmb: vec(64, () => 0.2),
    peakHours: [20, 21, 22],
    dwellHistogram: [0.1, 0.2, 0.3, 0.3, 0.1],
    hesitationP50Ms: 4500,
    regretRate: 0.05,
    repeatPassRate: 0.02,
    ...over,
  };
}

function summary(over: Partial<SessionSummaryRow> = {}): SessionSummaryRow {
  return {
    uidHash: 'h', sessionId: 's1',
    startedAt: new Date(), endedAt: new Date(),
    durationMs: 60_000, idleMs: 0, routesVisited: ['/discover'],
    cardsViewed: 10, swipesLeft: 0, swipesRight: 0,
    msgsSent: 0, msgsRead: 0,
    zeroActionSession: false, windowShopping: false, ghostedSelf: false,
    ...over,
  };
}

const BASE = {
  myIntent: 'serious' as string | null, candIntent: 'serious' as string | null,
  myAge: 28 as number | null, candAge: 28 as number | null, cityKm: 5 as number | null,
  myInterests: ['hiking', 'jazz'], candInterests: ['hiking', 'jazz'],
  pair: undefined as PairRow | undefined,
  priorCount: 0, impressionsLast48h: 0,
  consent: 'full' as const,
};

describe('forYouV6 — weights', () => {
  it('FORYOU_V6_WEIGHTS sum to exactly 1.0', () => {
    const s = Object.values(FORYOU_V6_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(s).toBeCloseTo(1, 5);
  });
  it('has all 11 recipe ingredients', () => {
    expect(Object.keys(FORYOU_V6_WEIGHTS).sort()).toEqual([
      'ageSimilarity', 'attentionFit', 'behaviouralTwinIndex', 'chronotypeOverlap',
      'communicationCadenceFit', 'distanceFit', 'hesitationFit', 'interestsOverlap',
      'moveStyleCompat', 'reciprocalIntentScore', 'vibeAlignment',
    ]);
  });
});

describe('reciprocalIntentScore', () => {
  it('matches intentMatchScore baseline when activity unknown', () => {
    expect(reciprocalIntentScore('serious', 'serious')).toBe(1);
    expect(reciprocalIntentScore('serious', 'casual')).toBe(0);
  });
  it('boosts when candidate shows recent quality activity', () => {
    expect(reciprocalIntentScore('casual', 'friends', true)).toBeGreaterThan(0.5);
  });
  it('damps when candidate is inactive', () => {
    expect(reciprocalIntentScore('serious', 'serious', false)).toBeLessThan(1);
  });
});

describe('communicationCadenceFit', () => {
  it('returns 0.5 neutral when either side missing', () => {
    expect(communicationCadenceFit(null, 5000)).toBe(0.5);
    expect(communicationCadenceFit(5000, null)).toBe(0.5);
  });
  it('returns ~1.0 for matching cadences', () => {
    expect(communicationCadenceFit(60_000, 60_000)).toBeGreaterThan(0.99);
  });
  it('decays with cadence delta (60s halflife)', () => {
    const fit = communicationCadenceFit(5_000, 305_000); // 300s apart
    expect(fit).toBeLessThan(0.05);
  });
});

describe('moveStyleCompat', () => {
  it('returns 0.5 for unknown', () => {
    expect(moveStyleCompat(null, 'wordsmith')).toBe(0.5);
    expect(moveStyleCompat('wordsmith', null)).toBe(0.5);
  });
  it('returns 1.0 for same archetype', () => {
    expect(moveStyleCompat('wordsmith', 'wordsmith')).toBe(1);
  });
  it('returns 0.7 for complementary pairs', () => {
    expect(moveStyleCompat('wordsmith', 'voice_first')).toBe(0.7);
    expect(moveStyleCompat('voice_first', 'wordsmith')).toBe(0.7);
  });
});

describe('scoreForYouV6 — cold path', () => {
  it('returns 0..100', () => {
    const out = scoreForYouV6({ ...BASE, me: feature(), cand: feature(), behavior: undefined });
    expect(out.score).toBeGreaterThanOrEqual(0);
    expect(out.score).toBeLessThanOrEqual(100);
  });
  it('explain.algo is forYouV6 with v6 weights', () => {
    const out = scoreForYouV6({ ...BASE, me: feature(), cand: feature() });
    expect(out.explain.algo).toBe('forYouV6');
    expect(out.explain.weights).toEqual(FORYOU_V6_WEIGHTS);
  });
  it('high compatibility scores high', () => {
    const out = scoreForYouV6({ ...BASE, me: feature(), cand: feature() });
    expect(out.score).toBeGreaterThan(50);
  });
  it('low compatibility (opposite interests, different ages, far) scores well below high-compat baseline', () => {
    const high = scoreForYouV6({ ...BASE, me: feature(), cand: feature() });
    const me = feature({ interestVec: vec(32, (i) => (i < 16 ? 1 : 0)), vibeEmb: vec(64, () => 0.1) });
    const cand = feature({ interestVec: vec(32, (i) => (i < 16 ? 0 : 1)), vibeEmb: vec(64, () => -0.1) });
    const low = scoreForYouV6({
      ...BASE, me, cand,
      myAge: 22, candAge: 60, cityKm: 5000,
      myInterests: ['a'], candInterests: ['b'],
      myIntent: 'casual', candIntent: 'marriage',
    });
    expect(high.score - low.score).toBeGreaterThan(20);
  });
});

describe('scoreForYouV6 — penalties & boosts', () => {
  // Use mediocre features so the baseline has headroom for the boost.
  const mediumFeature = () => feature({
    interestVec: vec(32, (i) => (i % 2 === 0 ? 0.3 : 0)),
    vibeEmb: vec(64, () => 0.05),
    behaviorEmb: vec(64, () => 0.05),
    dwellHistogram: [0.4, 0.3, 0.2, 0.1, 0.0],
    hesitationP50Ms: 2000,
  });
  const mediumOther = () => feature({
    interestVec: vec(32, (i) => (i % 2 === 1 ? 0.3 : 0)),
    vibeEmb: vec(64, () => -0.05),
    behaviorEmb: vec(64, () => -0.05),
    dwellHistogram: [0.0, 0.1, 0.2, 0.3, 0.4],
    hesitationP50Ms: 12000,
  });
  const inputs = () => ({ ...BASE, cityKm: 200, myIntent: 'casual', candIntent: 'friends', me: mediumFeature(), cand: mediumOther() });

  it('regret penalty docks up to 8 points', () => {
    const clean = scoreForYouV6(inputs());
    const regret: PairBehavior = { regrets: 10, repeatPasses: 0, returns: 0, maxDwellMs: 0 };
    const docked = scoreForYouV6({ ...inputs(), behavior: regret });
    expect(clean.score - docked.score).toBeGreaterThanOrEqual(7.9);
  });
  it('repeat-pass penalty docks 15 points', () => {
    const clean = scoreForYouV6(inputs());
    const rp: PairBehavior = { regrets: 0, repeatPasses: 1, returns: 0, maxDwellMs: 0 };
    const docked = scoreForYouV6({ ...inputs(), behavior: rp });
    expect(clean.score - docked.score).toBeGreaterThanOrEqual(14.9);
  });
  it('return boost adds up to +6 points', () => {
    const clean = scoreForYouV6(inputs());
    const ret: PairBehavior = { regrets: 0, repeatPasses: 0, returns: 5, maxDwellMs: 0 };
    const boosted = scoreForYouV6({ ...inputs(), behavior: ret });
    expect(boosted.score - clean.score).toBeGreaterThanOrEqual(5.9);
  });
  it('window-shopping damp triggers when last 3 sessions are all windowShopping', () => {
    const sessions = [
      summary({ sessionId: 's3', windowShopping: true }),
      summary({ sessionId: 's2', windowShopping: true }),
      summary({ sessionId: 's1', windowShopping: true }),
    ];
    const clean = scoreForYouV6(inputs());
    const damped = scoreForYouV6({ ...inputs(), mySessions: sessions });
    expect(clean.score - damped.score).toBeGreaterThanOrEqual(4.9);
  });
  it('window-shopping damp does NOT trigger when only some sessions are ws', () => {
    const sessions = [
      summary({ sessionId: 's3', windowShopping: true }),
      summary({ sessionId: 's2', windowShopping: false }),
      summary({ sessionId: 's1', windowShopping: true }),
    ];
    const clean = scoreForYouV6(inputs());
    const same = scoreForYouV6({ ...inputs(), mySessions: sessions });
    expect(Math.abs(clean.score - same.score)).toBeLessThan(0.001);
  });
  it('FORYOU_V6_PENALTIES export matches expected shape', () => {
    expect(FORYOU_V6_PENALTIES.regretMaxPoints).toBe(8);
    expect(FORYOU_V6_PENALTIES.repeatPassPoints).toBe(15);
    expect(FORYOU_V6_PENALTIES.returnBoostMaxPoints).toBe(6);
    expect(FORYOU_V6_PENALTIES.windowShoppingDampPoints).toBe(5);
  });
});

describe('scoreForYouV6 — cache fast path', () => {
  it('honours fresh PairCompatCache row', () => {
    const pair: PairRow = {
      aHash: 'a', bHash: 'b',
      interestCos: 0.8, vibeCos: 0.7, behaviorCos: 0.6,
      chronoOverlap: 0.9, priorInteractionScore: 0.1,
      finalScore: 0.75, computedAt: new Date(),
    } as PairRow;
    const out = scoreForYouV6({ ...BASE, me: feature(), cand: feature(), pair });
    expect(out.explain.cacheHit).toBe(true);
    expect(out.score).toBeGreaterThan(50);
  });
  it('prefers v6Score over finalScore when present', () => {
    const baseRow: PairRow = {
      aHash: 'a', bHash: 'b',
      interestCos: 0.5, vibeCos: 0.5, behaviorCos: 0.5,
      chronoOverlap: 0.5, priorInteractionScore: 0,
      finalScore: 0.40, computedAt: new Date(),
    } as PairRow;
    const withV6 = { ...baseRow, v6Score: 0.90 } as PairRow & { v6Score: number };
    const lo = scoreForYouV6({ ...BASE, me: feature(), cand: feature(), pair: baseRow });
    const hi = scoreForYouV6({ ...BASE, me: feature(), cand: feature(), pair: withV6 });
    expect(hi.score).toBeGreaterThan(lo.score);
  });
  it('treats stale cache (>30min) as cold path', () => {
    const stale: PairRow = {
      aHash: 'a', bHash: 'b',
      interestCos: 0.8, vibeCos: 0.7, behaviorCos: 0.6,
      chronoOverlap: 0.9, priorInteractionScore: 0.1,
      finalScore: 0.75,
      computedAt: new Date(Date.now() - 31 * 60 * 1000),
    } as PairRow;
    const out = scoreForYouV6({ ...BASE, me: feature(), cand: feature(), pair: stale });
    expect(out.explain.cacheHit).toBe(false);
  });
});

describe('scoreForYou dispatcher — v6 flag', () => {
  const origV5 = process.env.ALGO_V5_FOR_YOU_ENABLED;
  const origV6 = process.env.ALGO_V6_FOR_YOU_ENABLED;
  beforeEach(() => {
    delete process.env.ALGO_V5_FOR_YOU_ENABLED;
    delete process.env.ALGO_V6_FOR_YOU_ENABLED;
  });
  afterEach(() => {
    if (origV5 != null) process.env.ALGO_V5_FOR_YOU_ENABLED = origV5; else delete process.env.ALGO_V5_FOR_YOU_ENABLED;
    if (origV6 != null) process.env.ALGO_V6_FOR_YOU_ENABLED = origV6; else delete process.env.ALGO_V6_FOR_YOU_ENABLED;
  });

  it('falls through to v4 when no flag set', () => {
    const out = scoreForYou({ ...BASE, me: feature(), cand: feature() });
    expect(out.explain.algo).toBe('forYou');
  });
  it('routes to v5 when only v5 flag set', () => {
    process.env.ALGO_V5_FOR_YOU_ENABLED = '1';
    const out = scoreForYou({ ...BASE, me: feature(), cand: feature() });
    expect(out.explain.algo).toBe('forYou'); // v5 keeps the legacy algo tag
    expect(out.explain.weights).toHaveProperty('attentionFit');
  });
  it('routes to v6 when v6 flag set (even if v5 also set)', () => {
    process.env.ALGO_V5_FOR_YOU_ENABLED = '1';
    process.env.ALGO_V6_FOR_YOU_ENABLED = '1';
    const out = scoreForYou({ ...BASE, me: feature(), cand: feature() });
    expect(out.explain.algo).toBe('forYouV6');
  });
});
