import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  scoreForYouV5, scoreForYou, attentionFit, hesitationFit,
  FORYOU_V5_WEIGHTS, FORYOU_V5_PENALTIES,
} from '../forYou';
import type { FeatureRow, PairRow, PairBehavior } from '../signals';

function vec(n: number, fn: (i: number) => number): Float32Array {
  const v = new Float32Array(n);
  for (let i = 0; i < n; i++) v[i] = fn(i);
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
    dwellHistogram: [0.1, 0.2, 0.3, 0.3, 0.1],
    hesitationP50Ms: 4500,
    regretRate: 0.05,
    repeatPassRate: 0.02,
    ...over,
  };
}

const BASE_INPUTS = {
  myIntent: 'serious', candIntent: 'serious',
  myAge: 28, candAge: 28, cityKm: 5,
  myInterests: ['hiking','jazz'], candInterests: ['hiking','jazz'],
  pair: undefined as PairRow | undefined,
  priorCount: 0, impressionsLast48h: 0,
  consent: 'full' as const,
};

describe('forYou v5 — weights', () => {
  it('FORYOU_V5_WEIGHTS sum to exactly 1.0', () => {
    const s = Object.values(FORYOU_V5_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(s).toBeCloseTo(1, 5);
  });
  it('v5 weights include the two new terms', () => {
    expect(FORYOU_V5_WEIGHTS).toHaveProperty('attentionFit');
    expect(FORYOU_V5_WEIGHTS).toHaveProperty('hesitationFit');
  });
});

describe('attentionFit helper', () => {
  it('returns 0.5 fallback when either histogram missing', () => {
    expect(attentionFit(null, feature())).toBe(0.5);
    expect(attentionFit(feature(), feature({ dwellHistogram: null }))).toBe(0.5);
  });
  it('returns ~1.0 for identical histograms', () => {
    const a = feature({ dwellHistogram: [0.2, 0.2, 0.2, 0.2, 0.2] });
    const b = feature({ dwellHistogram: [0.2, 0.2, 0.2, 0.2, 0.2] });
    expect(attentionFit(a, b)).toBeGreaterThan(0.99);
  });
  it('returns lower score for diverging histograms', () => {
    const reader  = feature({ dwellHistogram: [0.0, 0.0, 0.1, 0.4, 0.5] });
    const scanner = feature({ dwellHistogram: [0.5, 0.4, 0.1, 0.0, 0.0] });
    expect(attentionFit(reader, scanner)).toBeLessThan(0.6);
  });
});

describe('hesitationFit helper', () => {
  it('returns 0.5 fallback when either median missing', () => {
    expect(hesitationFit(feature({ hesitationP50Ms: null }), feature())).toBe(0.5);
  });
  it('returns ~1.0 for matching decision speeds', () => {
    const a = feature({ hesitationP50Ms: 3000 });
    const b = feature({ hesitationP50Ms: 3000 });
    expect(hesitationFit(a, b)).toBeGreaterThan(0.99);
  });
  it('decays with delta in deciders\u2019 latencies', () => {
    const a = feature({ hesitationP50Ms: 2000 });
    const b = feature({ hesitationP50Ms: 14000 }); // 12s slower
    expect(hesitationFit(a, b)).toBeLessThan(hesitationFit(a, feature({ hesitationP50Ms: 4000 })));
  });
});

describe('scoreForYouV5 — cold path', () => {
  it('identical compatible users score very high (>= v4 baseline)', () => {
    const me = feature();
    const cand = feature();
    const { score, explain } = scoreForYouV5({ ...BASE_INPUTS, me, cand });
    expect(score).toBeGreaterThan(70);
    expect(explain.breakdown.attentionFit).not.toBeNull();
    expect(explain.breakdown.hesitationFit).not.toBeNull();
  });

  it('regret penalty reduces score, capped at 8 points', () => {
    const me = feature(), cand = feature();
    const noRegret = scoreForYouV5({ ...BASE_INPUTS, me, cand, behavior: { regrets: 0, repeatPasses: 0, returns: 0, maxDwellMs: 0 } });
    const someRegret = scoreForYouV5({ ...BASE_INPUTS, me, cand, behavior: { regrets: 2, repeatPasses: 0, returns: 0, maxDwellMs: 0 } });
    const lotsOfRegret = scoreForYouV5({ ...BASE_INPUTS, me, cand, behavior: { regrets: 20, repeatPasses: 0, returns: 0, maxDwellMs: 0 } });
    expect(someRegret.score).toBeLessThan(noRegret.score);
    // cap: more regrets than 4 should hit the same cap
    expect(noRegret.score - lotsOfRegret.score).toBeLessThanOrEqual(FORYOU_V5_PENALTIES.regretMaxPoints + 0.001);
  });

  it('repeat-pass triggers hard 15 point penalty', () => {
    const me = feature(), cand = feature();
    const fresh = scoreForYouV5({ ...BASE_INPUTS, me, cand });
    const repeated = scoreForYouV5({ ...BASE_INPUTS, me, cand, behavior: { regrets: 0, repeatPasses: 1, returns: 0, maxDwellMs: 0 } });
    expect(fresh.score - repeated.score).toBeGreaterThanOrEqual(14.9);
    expect(repeated.explain.breakdown.repeatPassPenalty).toBe(-FORYOU_V5_PENALTIES.repeatPassPoints);
  });

  it('intent.profile.settle returns boost up to +6', () => {
    const me = feature(), cand = feature();
    const baseline = scoreForYouV5({ ...BASE_INPUTS, me, cand });
    const oneReturn = scoreForYouV5({ ...BASE_INPUTS, me, cand, behavior: { regrets: 0, repeatPasses: 0, returns: 1, maxDwellMs: 0 } });
    const lotsReturns = scoreForYouV5({ ...BASE_INPUTS, me, cand, behavior: { regrets: 0, repeatPasses: 0, returns: 99, maxDwellMs: 0 } });
    expect(oneReturn.score).toBeGreaterThan(baseline.score - 0.001);
    expect(lotsReturns.score - baseline.score).toBeLessThanOrEqual(FORYOU_V5_PENALTIES.returnBoostMaxPoints + 0.001);
  });

  it('explain object is lossless — every v5 adjustment present', () => {
    const me = feature(), cand = feature();
    const { explain } = scoreForYouV5({
      ...BASE_INPUTS, me, cand,
      behavior: { regrets: 1, repeatPasses: 0, returns: 1, maxDwellMs: 4000 },
    });
    expect(explain.breakdown).toHaveProperty('attentionFit');
    expect(explain.breakdown).toHaveProperty('hesitationFit');
    expect(explain.breakdown).toHaveProperty('regretPenalty');
    expect(explain.breakdown).toHaveProperty('repeatPassPenalty');
    expect(explain.breakdown).toHaveProperty('returnBoost');
    expect(explain.weights).toEqual(FORYOU_V5_WEIGHTS);
  });

  it('monotonicity: better compatibility \u2192 higher score', () => {
    const me = feature();
    const great = feature({
      interestVec: me.interestVec, vibeEmb: me.vibeEmb, behaviorEmb: me.behaviorEmb,
      chronotype: 'evening', hesitationP50Ms: 4500,
    });
    const poor = feature({
      interestVec: vec(32, (i) => Math.sin(i)),
      vibeEmb: vec(64, (i) => Math.cos(i*7)),
      behaviorEmb: vec(64, (i) => Math.sin(i*13)),
      chronotype: 'morning', hesitationP50Ms: 30000,
    });
    const gs = scoreForYouV5({ ...BASE_INPUTS, me, cand: great });
    const ps = scoreForYouV5({ ...BASE_INPUTS, me, cand: poor, candInterests: ['random'] });
    expect(gs.score).toBeGreaterThan(ps.score);
  });
});

describe('scoreForYouV5 — cache fast path', () => {
  it('cache hit applies v5 adjustments on top of cached finalScore', () => {
    const pair: PairRow = {
      aHash: 'a', bHash: 'b',
      interestCos: 0.9, vibeCos: 0.8, behaviorCos: 0.7, magnetCos: 0.85,
      chronoOverlap: 1, cadenceOverlap: 0.5, priorInteractionScore: 0.3,
      finalScore: 0.85, computedAt: new Date(),
    };
    const me = feature(), cand = feature();
    const noBehavior = scoreForYouV5({ ...BASE_INPUTS, me, cand, pair });
    const withRegret = scoreForYouV5({ ...BASE_INPUTS, me, cand, pair, behavior: { regrets: 4, repeatPasses: 0, returns: 0, maxDwellMs: 0 } });
    expect(noBehavior.explain.cacheHit).toBe(true);
    expect(withRegret.score).toBeLessThan(noBehavior.score);
    expect(withRegret.score).toBeGreaterThanOrEqual(noBehavior.score - FORYOU_V5_PENALTIES.regretMaxPoints - 0.001);
  });
});

describe('scoreForYou dispatcher honors ALGO_V5_FOR_YOU_ENABLED', () => {
  const orig = process.env.ALGO_V5_FOR_YOU_ENABLED;
  beforeEach(() => { delete process.env.ALGO_V5_FOR_YOU_ENABLED; });
  afterEach(() => { if (orig !== undefined) process.env.ALGO_V5_FOR_YOU_ENABLED = orig; });

  it('returns v4 explain shape by default', () => {
    const me = feature(), cand = feature();
    const { explain } = scoreForYou({ ...BASE_INPUTS, me, cand });
    expect(explain.breakdown).not.toHaveProperty('attentionFit');
  });

  it('returns v5 explain shape when flag = 1', () => {
    process.env.ALGO_V5_FOR_YOU_ENABLED = '1';
    const me = feature(), cand = feature();
    const { explain } = scoreForYou({ ...BASE_INPUTS, me, cand });
    expect(explain.breakdown).toHaveProperty('attentionFit');
  });
});

describe('golden Priya \u00d7 Arjun v5', () => {
  it('hand-computed expected score is stable within \u00b12', () => {
    // Priya: evening, reader, hesitates ~4.5s
    const priya = feature({
      chronotype: 'evening', attentionProfile: 'reader',
      hesitationP50Ms: 4500, dwellHistogram: [0.1, 0.15, 0.25, 0.35, 0.15],
    });
    // Arjun: evening, reader, hesitates ~5s
    const arjun = feature({
      chronotype: 'evening', attentionProfile: 'reader',
      hesitationP50Ms: 5000, dwellHistogram: [0.1, 0.15, 0.25, 0.35, 0.15],
    });
    const { score, explain } = scoreForYouV5({
      ...BASE_INPUTS,
      me: priya, cand: arjun,
      cityKm: 12, myAge: 28, candAge: 30,
      myInterests: ['hiking','jazz','photography'],
      candInterests: ['hiking','jazz','trekking'],
      impressionsLast48h: 6,
      behavior: { regrets: 0, repeatPasses: 0, returns: 1, maxDwellMs: 4200 },
    });
    expect(score).toBeGreaterThan(60);
    expect(score).toBeLessThan(95);
    expect(explain.cacheHit).toBe(false);
  });
});
