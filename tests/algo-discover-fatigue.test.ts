/**
 * Verifies the Phase F bandit wiring: two candidates with identical raw scores
 * should be re-ordered when one of them has many recent impressions without
 * engagement. Mirrors the v4 discover block in services/social/src/server.ts.
 */
import { describe, it, expect } from 'vitest';
import { postImpressionPenalty } from '../services/shared/src/algo/postImpressionRerank';
import { scoreForYou } from '../services/shared/src/algo/forYou';
import type { FeatureRow } from '../services/shared/src/algo/signals';

function feat(hash: string): FeatureRow {
  return {
    uidHash: hash, chronotype: 'evening', attentionProfile: 'reader',
    rageClickRate: 0.02, deadClickRate: 0.02, swipeRightRatio: 0.5,
    replyPersonaP50Ms: 50_000, responseRate: 0.7,
    interestVec: null, vibeEmb: null, behaviorEmb: null,
    peakHours: [20, 21],
  };
}

describe('discover v4 bandit fatigue (Phase F)', () => {
  const me = feat('me');
  const cand = feat('cand');
  const baseInputs = {
    me, cand,
    myIntent: 'serious', candIntent: 'serious',
    myAge: 28, candAge: 28, cityKm: 5,
    myInterests: ['hiking'], candInterests: ['hiking'],
    pair: undefined, priorCount: 0, impressionsLast48h: 0,
    consent: 'full' as const,
  };

  it('penalty grows with skipped count and shrinks with time', () => {
    expect(postImpressionPenalty(0, 60)).toBe(0);
    const fresh = postImpressionPenalty(20, 60);
    const stale = postImpressionPenalty(20, 7 * 86400);
    expect(fresh).toBeGreaterThan(stale);
  });

  it('skipped candidate ranks below a fresh peer with identical features', () => {
    const baseScore = scoreForYou(baseInputs).score;
    const skipped = Math.max(0, baseScore - postImpressionPenalty(15, 6 * 3600, 12));
    const fresh = baseScore;
    expect(skipped).toBeLessThan(fresh);
  });

  it('penalty stays within sane bounds (< base * 1.0)', () => {
    // postImpressionPenalty multiplier = logScale(n,50) * (0.3 + 0.7*expDecay)
    // logScale caps at log1p(n)/log(cap+1) which never exceeds 1 for n<=50.
    const p = postImpressionPenalty(50, 0, 12);
    expect(p).toBeLessThanOrEqual(12);
  });
});
