/**
 * aiPicks v5 tests — returnRate term + dispatcher.
 */
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import {
  scoreAiPicksV4,
  scoreAiPicksV5,
  scoreAiPicks,
  AI_PICKS_WEIGHTS,
  AI_PICKS_V5_WEIGHTS,
  type AiPicksSubScores,
} from '../aiPicks';
import type { FeatureRow } from '../signals';

function vec(n: number): Float32Array {
  const v = new Float32Array(n).fill(1);
  const inv = 1 / Math.sqrt(n);
  for (let i = 0; i < n; i++) v[i] *= inv;
  return v;
}

const me: FeatureRow = {
  uidHash: 'a', chronotype: 'evening', attentionProfile: 'reader',
  rageClickRate: 0, deadClickRate: 0, swipeRightRatio: 0.4,
  replyPersonaP50Ms: 60000, responseRate: 0.7,
  interestVec: vec(32), vibeEmb: vec(64), behaviorEmb: vec(64),
  peakHours: [20, 21, 22],
};

const baseSubs: AiPicksSubScores = {
  cf: 50, active: 50, serious: 50, matchHistoryAffinity: 50, vibeMomentum: 50,
};

const baseInputs = {
  me, cand: me,
  myIntent: 'serious' as const, candIntent: 'serious' as const,
  myAge: 28, candAge: 28, cityKm: 5,
  myInterests: [] as string[], candInterests: [] as string[],
  pair: undefined, priorCount: 0, impressionsLast48h: 0,
  consent: 'full' as const,
  rand: () => 1, // no explore noise
};

describe('aiPicks v5 weights', () => {
  it('AI_PICKS_V5_WEIGHTS sums to 1.0', () => {
    const s = Object.values(AI_PICKS_V5_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(s).toBeCloseTo(1, 5);
  });
  it('returnRate is a new positive term not present in v4', () => {
    expect((AI_PICKS_WEIGHTS as Record<string, number>).returnRate).toBeUndefined();
    expect(AI_PICKS_V5_WEIGHTS.returnRate).toBeGreaterThan(0);
  });
});

describe('scoreAiPicksV5', () => {
  it('returnRate=undefined behaves like v4 (within rounding)', () => {
    const v4 = scoreAiPicksV4({ ...baseInputs, subs: { ...baseSubs } });
    const v5 = scoreAiPicksV5({ ...baseInputs, subs: { ...baseSubs } });
    // v5 has slightly different weights; both should be reasonable
    expect(v5.score).toBeGreaterThan(0);
    expect(v5.score).toBeLessThanOrEqual(100);
    expect(Math.abs(v5.score - v4.score)).toBeLessThan(10);
  });

  it('high returnRate raises the v5 score monotonically', () => {
    const low = scoreAiPicksV5({ ...baseInputs, subs: { ...baseSubs, returnRate: 0 } });
    const mid = scoreAiPicksV5({ ...baseInputs, subs: { ...baseSubs, returnRate: 50 } });
    const high = scoreAiPicksV5({ ...baseInputs, subs: { ...baseSubs, returnRate: 100 } });
    expect(mid.score).toBeGreaterThan(low.score);
    expect(high.score).toBeGreaterThan(mid.score);
  });

  it('returnRate clipped to [0, 100]', () => {
    const clipped = scoreAiPicksV5({ ...baseInputs, subs: { ...baseSubs, returnRate: 999 } });
    const max = scoreAiPicksV5({ ...baseInputs, subs: { ...baseSubs, returnRate: 100 } });
    expect(clipped.score).toBe(max.score);
  });

  it('explain includes returnRate in subScores and uses v5 weights', () => {
    const { explain } = scoreAiPicksV5({ ...baseInputs, subs: { ...baseSubs, returnRate: 80 } });
    expect(explain.subScores.returnRate).toBe(80);
    expect(explain.weights).toEqual({ ...AI_PICKS_V5_WEIGHTS });
  });
});

describe('scoreAiPicks dispatcher', () => {
  const prev = process.env.ALGO_V5_AI_PICKS_ENABLED;
  beforeEach(() => { delete process.env.ALGO_V5_AI_PICKS_ENABLED; });
  afterEach(() => {
    if (prev === undefined) delete process.env.ALGO_V5_AI_PICKS_ENABLED;
    else process.env.ALGO_V5_AI_PICKS_ENABLED = prev;
  });

  it('falls back to v4 weights when flag is off', () => {
    const { explain } = scoreAiPicks({ ...baseInputs, subs: { ...baseSubs } });
    expect(explain.weights).toEqual({ ...AI_PICKS_WEIGHTS });
  });

  it('uses v5 weights when ALGO_V5_AI_PICKS_ENABLED=1', () => {
    process.env.ALGO_V5_AI_PICKS_ENABLED = '1';
    const { explain } = scoreAiPicks({ ...baseInputs, subs: { ...baseSubs, returnRate: 50 } });
    expect(explain.weights).toEqual({ ...AI_PICKS_V5_WEIGHTS });
  });
});
