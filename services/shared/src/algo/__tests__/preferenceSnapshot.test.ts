import { describe, it, expect } from 'vitest';
import { defaultProfile, decayProfile, updateProfile } from '../learner';
import { snapshotProfile, diffSnapshots } from '../preferenceSnapshot';

describe('preferenceSnapshot', () => {
  it('returns top, bottom, entropy and posterior', () => {
    const p = defaultProfile();
    const snap = snapshotProfile(p, 3);
    expect(snap.top).toHaveLength(3);
    expect(snap.bottom).toHaveLength(3);
    expect(snap.entropy).toBeGreaterThan(0);
    expect(Object.keys(snap.posterior).length).toBe(11);
    for (const v of Object.values(snap.posterior)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('top is sorted descending by weight', () => {
    const p = defaultProfile();
    const snap = snapshotProfile(p, 11);
    for (let i = 1; i < snap.top.length; i++) {
      expect(snap.top[i - 1].w).toBeGreaterThanOrEqual(snap.top[i].w);
    }
  });

  it('detects taste shift via diffSnapshots', () => {
    const before = snapshotProfile(defaultProfile(), 11);
    let p = defaultProfile();
    p = updateProfile(p, [
      { ingredient: 'interestsOverlap', reward: 1 },
      { ingredient: 'interestsOverlap', reward: 1 },
      { ingredient: 'interestsOverlap', reward: 1 },
    ]);
    const after = snapshotProfile(p, 11);
    const diffs = diffSnapshots(before, after);
    const interests = diffs.find((d) => d.key === 'interestsOverlap');
    expect(interests).toBeDefined();
    expect(interests!.delta).toBeGreaterThan(0);
  });
});

describe('decayProfile', () => {
  it('halves excess evidence after one half-life', () => {
    let p = defaultProfile();
    p = updateProfile(p, [
      { ingredient: 'interestsOverlap', reward: 1 },
      { ingredient: 'interestsOverlap', reward: 1 },
      { ingredient: 'interestsOverlap', reward: 1 },
      { ingredient: 'interestsOverlap', reward: 1 },
    ]);
    const before = p.banditAlpha.interestsOverlap;
    expect(before).toBeGreaterThan(1);
    const decayed = decayProfile(p, 14, 14);
    const after = decayed.banditAlpha.interestsOverlap;
    const expected = 1 + (before - 1) * 0.5;
    expect(after).toBeCloseTo(expected, 6);
  });

  it('is a no-op when daysElapsed is 0', () => {
    const p = defaultProfile();
    const d = decayProfile(p, 0, 14);
    expect(d.banditAlpha).toEqual(p.banditAlpha);
    expect(d.banditBeta).toEqual(p.banditBeta);
  });

  it('preserves the prior (alpha=1, beta=1) at infinite decay', () => {
    let p = defaultProfile();
    p = updateProfile(p, [{ ingredient: 'vibeAlignment', reward: 1 }]);
    const decayed = decayProfile(p, 1000, 14);
    expect(decayed.banditAlpha.vibeAlignment).toBeCloseTo(1, 3);
    expect(decayed.banditBeta.vibeAlignment).toBeCloseTo(1, 3);
  });
});
