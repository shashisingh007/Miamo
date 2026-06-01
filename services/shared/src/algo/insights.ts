/**
 * /me/insights pure builder — v6.7.
 *
 * Combines a `PreferenceSnapshot` (top/bottom ingredients + entropy) with a
 * per-surface, per-hour reward rollup into a compact JSON shape suitable
 * for the consumer-facing "your taste" surface and for diagnostics.
 *
 * Pure: no I/O. The HTTP endpoint just calls this and serialises.
 */
import type { PreferenceSnapshot } from './preferenceSnapshot';
import type { SurfaceHourSummary, SurfaceRewardKey } from './contextAwareRewards';

export type InsightsHotspot = {
  surface: string;
  hourOfDay: number;
  reward: number;
  n: number;
};

export type Insights = {
  generatedAt: string;
  topPreferences: PreferenceSnapshot['top'];
  bottomPreferences: PreferenceSnapshot['bottom'];
  /** Lower entropy = more decisive taste. */
  decisiveness: number;
  /** 0..1; how much of the bandit credit is concentrated in the top-3. */
  concentration: number;
  /** Best (surface, hour) windows ordered by reward desc. */
  hotspots: InsightsHotspot[];
  /** Surface → cumulative reward; one number per surface. */
  surfaceTotals: Record<string, number>;
  /** Hour-of-day → cumulative reward; 24 buckets, missing = 0. */
  hourTotals: Record<number, number>;
};

export type BuildInsightsInput = {
  snapshot: PreferenceSnapshot;
  rollup: Map<SurfaceRewardKey, SurfaceHourSummary>;
  hotspotsK?: number;
  now?: Date;
};

export function buildInsights(input: BuildInsightsInput): Insights {
  const k = Math.max(1, input.hotspotsK ?? 5);
  const now = input.now ?? new Date();

  const surfaceTotals: Record<string, number> = {};
  const hourTotals: Record<number, number> = {};
  const hotspotsAll: InsightsHotspot[] = [];

  for (const row of input.rollup.values()) {
    surfaceTotals[row.surface] = (surfaceTotals[row.surface] ?? 0) + row.totalReward;
    if (row.hourOfDay >= 0) {
      hourTotals[row.hourOfDay] = (hourTotals[row.hourOfDay] ?? 0) + row.totalReward;
    }
    hotspotsAll.push({
      surface: row.surface,
      hourOfDay: row.hourOfDay,
      reward: row.totalReward,
      n: row.n,
    });
  }

  hotspotsAll.sort((a, b) => b.reward - a.reward);
  const hotspots = hotspotsAll.slice(0, k);

  // Concentration: share of top-3 weights over total.
  const topSum = input.snapshot.top.slice(0, 3).reduce((s, e) => s + Math.max(0, e.w), 0);
  const allSum =
    [...input.snapshot.top, ...input.snapshot.bottom].reduce((s, e) => s + Math.max(0, e.w), 0) || 1;
  const concentration = Math.max(0, Math.min(1, topSum / allSum));

  // Decisiveness: 1 − normalized entropy (entropy is in nats; max ~ ln(11)).
  const maxEntropy = Math.log(11);
  const decisiveness = Math.max(0, Math.min(1, 1 - input.snapshot.entropy / maxEntropy));

  return {
    generatedAt: now.toISOString(),
    topPreferences: input.snapshot.top,
    bottomPreferences: input.snapshot.bottom,
    decisiveness,
    concentration,
    hotspots,
    surfaceTotals,
    hourTotals,
  };
}
