import { describe, it, expect } from 'vitest';
import { aggregateOutcomes, summariseByIngredient, type ImpressionObs } from '../outcomeAggregator';
import type { ExplainReport } from '../explain';

const exp = (contribs: Array<[string, number]>): ExplainReport => ({
  algo: 'forYouV6', cacheHit: false, finalScore: 50, fatiguePenalty: 0,
  rows: contribs.map(([k, v]) => ({
    key: k, kind: 'ingredient', value: 0.5, weight: 0.1, contribution: v,
  })),
});

const baseObs = (over: Partial<ImpressionObs> = {}): ImpressionObs => ({
  impressionId: 'i1', outcome: 'match',
  explain: exp([['interestsOverlap', 10], ['vibeAlignment', 5]]),
  ...over,
});

describe('aggregateOutcomes', () => {
  it('returns empty samples for empty input', () => {
    const r = aggregateOutcomes([]);
    expect(r.samples).toEqual([]);
    expect(r.totalReward).toBe(0);
    expect(r.impressionsConsidered).toBe(0);
  });

  it('counts every outcome (including no_decision)', () => {
    const r = aggregateOutcomes([
      baseObs({ impressionId: '1', outcome: 'match' }),
      baseObs({ impressionId: '2', outcome: 'no_decision' }),
      baseObs({ impressionId: '3', outcome: 'regret' }),
    ]);
    expect(r.outcomeCounts.match).toBe(1);
    expect(r.outcomeCounts.no_decision).toBe(1);
    expect(r.outcomeCounts.regret).toBe(1);
  });

  it('skips no_decision in samples but counts them', () => {
    const r = aggregateOutcomes([
      baseObs({ impressionId: '1', outcome: 'no_decision' }),
    ]);
    expect(r.samples).toEqual([]);
    expect(r.impressionsConsidered).toBe(0);
    expect(r.outcomeCounts.no_decision).toBe(1);
  });

  it('deduplicates by impressionId (keeps first)', () => {
    const r = aggregateOutcomes([
      baseObs({ impressionId: 'dup', outcome: 'match' }),
      baseObs({ impressionId: 'dup', outcome: 'regret' }), // ignored
    ]);
    expect(r.outcomeCounts.match).toBe(1);
    expect(r.outcomeCounts.regret).toBe(0);
    expect(r.impressionsConsidered).toBe(1);
  });

  it('positive outcomes produce positive total reward', () => {
    const r = aggregateOutcomes([
      baseObs({ impressionId: 'a', outcome: 'mutual_quality_chat' }),
    ]);
    expect(r.totalReward).toBeGreaterThan(0);
  });

  it('negative outcomes produce negative total reward', () => {
    const r = aggregateOutcomes([
      baseObs({ impressionId: 'a', outcome: 'regret' }),
    ]);
    expect(r.totalReward).toBeLessThan(0);
  });
});

describe('summariseByIngredient', () => {
  it('sums counts and rewards per ingredient', () => {
    const out = summariseByIngredient([
      { ingredient: 'interestsOverlap', reward: 0.5 },
      { ingredient: 'interestsOverlap', reward: -0.2 },
      { ingredient: 'vibeAlignment',    reward: 0.4 },
    ]);
    expect(out.interestsOverlap.count).toBe(2);
    expect(out.interestsOverlap.net).toBeCloseTo(0.3, 5);
    expect(out.vibeAlignment.count).toBe(1);
  });

  it('returns empty object for empty input', () => {
    expect(summariseByIngredient([])).toEqual({});
  });
});
