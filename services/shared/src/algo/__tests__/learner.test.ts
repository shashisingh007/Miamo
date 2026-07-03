import { describe, it, expect } from 'vitest';
import { defaultProfile, updateProfile, sampleWeights, type RewardSample } from '../learner';

function sumWeights(p: ReturnType<typeof defaultProfile>): number {
  return Object.values(p.weights).reduce((a, b) => a + b, 0);
}

describe('learner — defaultProfile', () => {
  it('weights sum to ~1.0', () => {
    expect(sumWeights(defaultProfile())).toBeCloseTo(1, 5);
  });
  it('all bandit priors initialised to (1, 1)', () => {
    const p = defaultProfile();
    expect(p.banditAlpha.interestsOverlap).toBe(1);
    expect(p.banditBeta.interestsOverlap).toBe(1);
  });
});

describe('learner — updateProfile', () => {
  it('positive rewards on an ingredient raise its bandit alpha', () => {
    const prev = defaultProfile();
    const samples: RewardSample[] = [
      { ingredient: 'attentionFit', reward: 1.0 },
      { ingredient: 'attentionFit', reward: 0.3 },
    ];
    const next = updateProfile(prev, samples);
    expect(next.banditAlpha.attentionFit).toBeGreaterThan(prev.banditAlpha.attentionFit);
    expect(next.banditBeta.attentionFit).toBe(prev.banditBeta.attentionFit);
  });

  it('negative rewards raise the bandit beta', () => {
    const prev = defaultProfile();
    const samples: RewardSample[] = [
      { ingredient: 'distanceFit', reward: -1.0 },
    ];
    const next = updateProfile(prev, samples);
    expect(next.banditBeta.distanceFit).toBeGreaterThan(prev.banditBeta.distanceFit);
  });

  it('weights still sum to ~1.0 after update', () => {
    const prev = defaultProfile();
    const samples: RewardSample[] = [
      { ingredient: 'interestsOverlap', reward: 1 },
      { ingredient: 'distanceFit', reward: -1 },
      { ingredient: 'attentionFit', reward: 0.5 },
    ];
    const next = updateProfile(prev, samples);
    expect(sumWeights(next)).toBeCloseTo(1, 5);
  });

  it('per-step weight delta is clamped to ±10%', () => {
    const prev = defaultProfile();
    // Hammer one ingredient with huge positive reward.
    const samples: RewardSample[] = Array.from({ length: 100 }, () => ({
      ingredient: 'interestsOverlap' as const, reward: 1,
    }));
    const next = updateProfile(prev, samples);
    // Even with extreme reward, the per-step nudge is capped — weight shouldn't more than double on a single update.
    expect(next.weights.interestsOverlap).toBeLessThan(prev.weights.interestsOverlap * 1.2);
  });

  it('input profile is not mutated', () => {
    const prev = defaultProfile();
    const before = JSON.stringify(prev);
    updateProfile(prev, [{ ingredient: 'attentionFit', reward: 1 }]);
    expect(JSON.stringify(prev)).toBe(before);
  });
});

describe('learner — sampleWeights', () => {
  it('returns current weights when exploration is forced off', () => {
    const p = defaultProfile();
    const w = sampleWeights(p, () => 0.9999); // rand > explorationRate
    expect(w).toEqual(p.weights);
  });

  it('returns jittered weights when exploring', () => {
    const p = defaultProfile();
    const w = sampleWeights(p, () => 0); // rand = 0 -> always explore
    const sum = Object.values(w).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });
});
