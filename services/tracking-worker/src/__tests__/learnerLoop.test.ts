import { describe, it, expect } from 'vitest';
import { _internals } from '../learnerLoop';
import { defaultProfile } from '../../../shared/src/algo/learner';

const { foldRewardSamples, profileFromRow, REWARD_MAP } = _internals;

describe('foldRewardSamples', () => {
  it('ignores unknown events', () => {
    const out = foldRewardSamples([
      { uidHash: 'a', evt: 'click', count: 100 },
    ]);
    expect(out.size).toBe(0);
  });

  it('expands count into N samples per event', () => {
    const out = foldRewardSamples([
      { uidHash: 'a', evt: 'swipe.right', count: 3 },
    ]);
    expect(out.get('a')!.length).toBe(3);
    expect(out.get('a')![0].reward).toBe(REWARD_MAP['swipe.right'].reward);
  });

  it('caps per-event samples at capPerEvent', () => {
    const out = foldRewardSamples([
      { uidHash: 'a', evt: 'swipe.right', count: 10_000 },
    ], 50);
    expect(out.get('a')!.length).toBe(50);
  });

  it('aggregates multiple events for the same user', () => {
    const out = foldRewardSamples([
      { uidHash: 'a', evt: 'swipe.right',  count: 2 },
      { uidHash: 'a', evt: 'swipe.regret', count: 1 },
      { uidHash: 'a', evt: 'safety.block', count: 1 },
    ]);
    expect(out.get('a')!.length).toBe(4);
    const negatives = out.get('a')!.filter((s) => s.reward < 0).length;
    expect(negatives).toBe(2);
  });

  it('keeps users separate', () => {
    const out = foldRewardSamples([
      { uidHash: 'a', evt: 'swipe.right',  count: 1 },
      { uidHash: 'b', evt: 'swipe.regret', count: 1 },
    ]);
    expect(out.get('a')).toBeDefined();
    expect(out.get('b')).toBeDefined();
    expect(out.get('a')![0].reward).toBeGreaterThan(0);
    expect(out.get('b')![0].reward).toBeLessThan(0);
  });
});

describe('profileFromRow', () => {
  it('returns a fresh defaultProfile when row is null', () => {
    const p = profileFromRow(null);
    const def = defaultProfile();
    expect(p.weights).toEqual(def.weights);
    expect(p.banditAlpha).toEqual(def.banditAlpha);
  });

  it('overlays partial weights atop defaultProfile', () => {
    const p = profileFromRow({
      uidHash: 'a',
      surface: 'discover',
      weights: { interestsOverlap: 0.5 },
      noveltyBoost: null,
      diversityBoost: null,
      explorationRate: 0.2,
      banditAlpha: null,
      banditBeta:  null,
    });
    expect(p.weights.interestsOverlap).toBe(0.5);
    // other weights inherit default
    expect(p.weights.vibeAlignment).toBeCloseTo(0.15);
    expect(p.explorationRate).toBe(0.2);
  });
});
