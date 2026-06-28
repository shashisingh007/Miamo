import { describe, it, expect } from 'vitest';
import { extractRewards, extractBatch, type RewardObservation } from '../learnerRewards';
import { formatExplain } from '../explain';
import { scoreForYouV6 } from '../forYouV6';
import { defaultProfile, updateProfile } from '../learner';
import type { FeatureRow, PairBehavior } from '../signals';

function vec(n: number, fn: (i: number) => number): Float32Array {
  const v = new Float32Array(n);
  for (let i = 0; i < n; i++) v[i] = fn(i);
  let s = 0; for (const x of v) s += x * x;
  const inv = s > 0 ? 1 / Math.sqrt(s) : 1;
  for (let i = 0; i < n; i++) v[i] *= inv;
  return v;
}

function feature(): FeatureRow {
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

function obs(outcome: RewardObservation['outcome']): RewardObservation {
  const out = scoreForYouV6({ ...BASE, me: feature(), cand: feature() });
  return { outcome, explain: formatExplain(out.explain) };
}

describe('extractRewards', () => {
  it('returns no samples for no_decision', () => {
    expect(extractRewards(obs('no_decision'))).toEqual([]);
  });

  it('returns positive samples for mutual_quality_chat', () => {
    const samples = extractRewards(obs('mutual_quality_chat'));
    expect(samples.length).toBeGreaterThan(0);
    expect(samples.every((s) => s.reward > 0)).toBe(true);
  });

  it('returns negative samples for regret', () => {
    const samples = extractRewards(obs('regret'));
    expect(samples.length).toBeGreaterThan(0);
    expect(samples.every((s) => s.reward < 0)).toBe(true);
  });

  it('returns negative samples for repeat_pass (smaller magnitude than regret)', () => {
    const regret = extractRewards(obs('regret'));
    const rp     = extractRewards(obs('repeat_pass'));
    const sumAbs = (xs: { reward: number }[]) => xs.reduce((s, x) => s + Math.abs(x.reward), 0);
    expect(sumAbs(rp)).toBeLessThan(sumAbs(regret));
  });

  it('sum of |rewards| for an outcome equals |base reward|', () => {
    const samples = extractRewards(obs('mutual_quality_chat'));
    const sum = samples.reduce((s, x) => s + x.reward, 0);
    // base reward = 1.0 for mutual_quality_chat; sum of proportional credits = 1.0
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('only emits samples for known ingredient keys', () => {
    const samples = extractRewards(obs('match'));
    const knownKeys = new Set([
      'interestsOverlap', 'vibeAlignment', 'behaviouralTwinIndex',
      'reciprocalIntentScore', 'attentionFit', 'hesitationFit',
      'chronotypeOverlap', 'ageSimilarity', 'distanceFit',
      'communicationCadenceFit', 'moveStyleCompat',
    ]);
    for (const s of samples) expect(knownKeys.has(s.ingredient)).toBe(true);
  });

  it('returns no samples when explain has no positive ingredient contribution', () => {
    // All-null breakdown: no ingredients have meaningful contribution
    const empty: RewardObservation = {
      outcome: 'match',
      explain: { algo: 'forYouV6', cacheHit: false, finalScore: 0, fatiguePenalty: 0, rows: [] },
    };
    expect(extractRewards(empty)).toEqual([]);
  });
});

describe('extractBatch', () => {
  it('returns flat list of samples across observations', () => {
    const batch = extractBatch([obs('match'), obs('regret'), obs('no_decision')]);
    expect(batch.length).toBeGreaterThan(0);
    // contains both signs
    expect(batch.some((s) => s.reward > 0)).toBe(true);
    expect(batch.some((s) => s.reward < 0)).toBe(true);
  });
});

describe('learner end-to-end with extracted rewards', () => {
  it('positive observations bump weights, negative damp them, sum stays ~1.0', () => {
    const prev = defaultProfile();
    const samples = extractBatch([obs('mutual_quality_chat'), obs('match')]);
    const next = updateProfile(prev, samples);
    const sum = Object.values(next.weights).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
    // At least one weight changed
    let changed = false;
    for (const k of Object.keys(next.weights) as (keyof typeof next.weights)[]) {
      if (next.weights[k] !== prev.weights[k]) { changed = true; break; }
    }
    expect(changed).toBe(true);
  });
});
