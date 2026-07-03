import { describe, it, expect } from 'vitest';
import { scoreAiPicksV4, AI_PICKS_WEIGHTS } from '../aiPicks';
import type { FeatureRow } from '../signals';

function vec(n: number): Float32Array {
  const v = new Float32Array(n).fill(1);
  const inv = 1/Math.sqrt(n);
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

describe('aiPicks ensemble', () => {
  it('weights sum to 1.0', () => {
    const s = Object.values(AI_PICKS_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(s).toBeCloseTo(1, 5);
  });

  it('high sub-scores produce high final score', () => {
    const { score } = scoreAiPicksV4({
      me, cand: me,
      myIntent: 'serious', candIntent: 'serious',
      myAge: 28, candAge: 28, cityKm: 5,
      myInterests: [], candInterests: [],
      pair: undefined, priorCount: 0, impressionsLast48h: 0,
      consent: 'full',
      subs: { cf: 90, active: 80, serious: 80, matchHistoryAffinity: 70, vibeMomentum: 60 },
      rand: () => 1, // no explore boost
    });
    expect(score).toBeGreaterThan(70);
  });

  it('explore epsilon injects 100-point boost ~10% of time', () => {
    let boosted = 0;
    const trials = 1000;
    for (let i = 0; i < trials; i++) {
      const { explain } = scoreAiPicksV4({
        me, cand: me,
        myIntent: 'serious', candIntent: 'serious',
        myAge: 28, candAge: 28, cityKm: 5,
        myInterests: [], candInterests: [],
        pair: undefined, priorCount: 0, impressionsLast48h: 0,
        consent: 'full',
        subs: { cf: 0, active: 0, serious: 0, matchHistoryAffinity: 0, vibeMomentum: 0 },
      });
      if (explain.exploreBoost > 0) boosted += 1;
    }
    const rate = boosted / trials;
    expect(rate).toBeGreaterThan(0.06);
    expect(rate).toBeLessThan(0.14);
  });

  it('explain carries forYouExplain + subScores', () => {
    const { explain } = scoreAiPicksV4({
      me, cand: me,
      myIntent: 'serious', candIntent: 'serious',
      myAge: 28, candAge: 28, cityKm: 5,
      myInterests: [], candInterests: [],
      pair: undefined, priorCount: 5, impressionsLast48h: 0,
      consent: 'full',
      subs: { cf: 50, active: 50, serious: 50, matchHistoryAffinity: 50, vibeMomentum: 50 },
      rand: () => 1,
    });
    expect(explain.forYouExplain).toBeDefined();
    expect(explain.forYouExplain.algo).toBe('forYou');
    expect(explain.subScores.cf).toBe(50);
    expect(explain.consentScope).toBe('full');
  });
});
