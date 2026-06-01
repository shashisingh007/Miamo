import { describe, it, expect } from 'vitest';
import { defaultProfile, updateProfile } from '../learner';
import { snapshotProfile } from '../preferenceSnapshot';
import {
  extractContextualRewards,
  rollupContextualRewards,
} from '../contextAwareRewards';
import { buildInsights } from '../insights';
import type { ExplainReport } from '../explain';

const REPORT: ExplainReport = {
  baseScore: 0.5,
  finalScore: 0.62,
  rows: [
    { kind: 'ingredient', key: 'interestsOverlap', weight: 0.18, raw: 0.9, contribution: 0.162 },
    { kind: 'ingredient', key: 'vibeAlignment', weight: 0.15, raw: 0.6, contribution: 0.09 },
  ],
};

describe('buildInsights', () => {
  it('produces a complete insights payload', () => {
    let profile = defaultProfile();
    profile = updateProfile(profile, [
      { ingredient: 'interestsOverlap', reward: 1 },
      { ingredient: 'interestsOverlap', reward: 1 },
    ]);
    const snapshot = snapshotProfile(profile, 5);
    const samples = [
      ...extractContextualRewards({ outcome: 'mutual_quality_chat', explain: REPORT, ctx: { sf: 'discover', lh: 22 } }),
      ...extractContextualRewards({ outcome: 'match', explain: REPORT, ctx: { sf: 'dtm', lh: 9 } }),
    ];
    const rollup = rollupContextualRewards(samples);

    const insights = buildInsights({ snapshot, rollup });

    expect(insights.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(insights.topPreferences.length).toBeGreaterThan(0);
    expect(insights.decisiveness).toBeGreaterThanOrEqual(0);
    expect(insights.decisiveness).toBeLessThanOrEqual(1);
    expect(insights.concentration).toBeGreaterThan(0);
    expect(insights.concentration).toBeLessThanOrEqual(1);
    expect(insights.hotspots.length).toBeGreaterThan(0);
    expect(insights.hotspots[0].reward).toBeGreaterThanOrEqual(insights.hotspots[insights.hotspots.length - 1].reward);
    expect(insights.surfaceTotals['discover']).toBeGreaterThan(0);
    expect(insights.hourTotals[22]).toBeGreaterThan(0);
  });

  it('handles empty rollup gracefully', () => {
    const profile = defaultProfile();
    const snapshot = snapshotProfile(profile, 5);
    const insights = buildInsights({ snapshot, rollup: new Map() });
    expect(insights.hotspots).toHaveLength(0);
    expect(Object.keys(insights.surfaceTotals)).toHaveLength(0);
    expect(Object.keys(insights.hourTotals)).toHaveLength(0);
    expect(insights.decisiveness).toBeGreaterThanOrEqual(0);
  });

  it('hotspotsK caps the hotspots list', () => {
    let profile = defaultProfile();
    profile = updateProfile(profile, [{ ingredient: 'interestsOverlap', reward: 1 }]);
    const snapshot = snapshotProfile(profile, 5);
    const samples = [
      ...extractContextualRewards({ outcome: 'match', explain: REPORT, ctx: { sf: 'a', lh: 1 } }),
      ...extractContextualRewards({ outcome: 'match', explain: REPORT, ctx: { sf: 'b', lh: 2 } }),
      ...extractContextualRewards({ outcome: 'match', explain: REPORT, ctx: { sf: 'c', lh: 3 } }),
      ...extractContextualRewards({ outcome: 'match', explain: REPORT, ctx: { sf: 'd', lh: 4 } }),
    ];
    const rollup = rollupContextualRewards(samples);
    const insights = buildInsights({ snapshot, rollup, hotspotsK: 2 });
    expect(insights.hotspots).toHaveLength(2);
  });
});
