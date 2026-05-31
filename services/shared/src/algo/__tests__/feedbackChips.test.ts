import { describe, it, expect } from 'vitest';
import { chipRewards } from '../feedbackChips';
import { formatExplain } from '../explain';
import { scoreForYouV6 } from '../forYouV6';
import type { FeatureRow } from '../signals';

function vec(n: number, fn: (i: number) => number): Float32Array {
  const v = new Float32Array(n);
  for (let i = 0; i < n; i++) v[i] = fn(i);
  let s = 0; for (const x of v) s += x * x;
  const inv = s > 0 ? 1 / Math.sqrt(s) : 1;
  for (let i = 0; i < n; i++) v[i] *= inv;
  return v;
}

function f(): FeatureRow {
  return {
    uidHash: 'h', chronotype: 'evening', attentionProfile: 'reader',
    rageClickRate: 0, deadClickRate: 0, swipeRightRatio: 0,
    replyPersonaP50Ms: 60_000, responseRate: 0.7,
    interestVec: vec(32, () => 0.5),
    vibeEmb: vec(64, () => 0.3),
    behaviorEmb: vec(64, () => 0.2),
    peakHours: null,
    dwellHistogram: [0.1, 0.2, 0.3, 0.3, 0.1],
    hesitationP50Ms: 4500,
  };
}

const BASE = {
  myIntent: 'serious' as string | null, candIntent: 'serious' as string | null,
  myAge: 28 as number | null, candAge: 28 as number | null, cityKm: 5 as number | null,
  myInterests: ['hiking'], candInterests: ['hiking'],
  pair: undefined, priorCount: 0, impressionsLast48h: 0,
  consent: 'full' as const,
};

function exp() {
  const out = scoreForYouV6({ ...BASE, me: f(), cand: f() });
  return formatExplain(out.explain);
}

describe('chipRewards', () => {
  it('produces positive rewards for great_match', () => {
    const samples = chipRewards('great_match', exp());
    expect(samples.length).toBeGreaterThan(0);
    expect(samples.every((s) => s.reward > 0)).toBe(true);
  });
  it('produces negative rewards for not_for_me', () => {
    const samples = chipRewards('not_for_me', exp());
    expect(samples.every((s) => s.reward < 0)).toBe(true);
  });
  it('emits at most TOP_K=3 samples', () => {
    const samples = chipRewards('boring', exp());
    expect(samples.length).toBeLessThanOrEqual(3);
  });
  it('sum of rewards equals chip base reward', () => {
    const samples = chipRewards('great_match', exp());
    const sum = samples.reduce((s, x) => s + x.reward, 0);
    expect(sum).toBeCloseTo(0.8, 5);
  });
  it('returns [] when explain has no usable rows', () => {
    expect(chipRewards('great_match', {
      algo: 'forYouV6', cacheHit: false, finalScore: 0, fatiguePenalty: 0, rows: [],
    })).toEqual([]);
  });
});
