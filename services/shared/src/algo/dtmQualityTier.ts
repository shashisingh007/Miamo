/**
 * dtmQualityTier \u2014 Phase 17 DTM analog of `qualityTier`.
 *
 * Maps a v6 DTM affinity score in [0, 1] to a discrete tier the Deep-Compat
 * surface uses for UX affordances ("deep match" chip, sort header bands).
 *
 *   tier 4  "soulmate"      score >= 0.85
 *   tier 3  "deep"          score >= 0.70
 *   tier 2  "aligned"       score >= 0.55
 *   tier 1  "exploring"     score >= 0.40
 *   tier 0  "unclear"       score <  0.40   or sparse coverage
 *
 * Bands are 0.15 wide, matching the discover tier separation so cross-
 * surface UX stays consistent.
 *
 * When coverage is sparse (one side `sparse` or `empty`) we downgrade the
 * tier by one so the UI doesn't over-promise on thin evidence.
 */
import type { DtmAffinityV6Report } from './dtmV6';

export type DtmQualityTier = 0 | 1 | 2 | 3 | 4;

export const DTM_TIER_LABELS: Record<DtmQualityTier, string> = {
  4: 'soulmate',
  3: 'deep',
  2: 'aligned',
  1: 'exploring',
  0: 'unclear',
};

export const DTM_TIER_THRESHOLDS: Array<{ tier: DtmQualityTier; min: number }> = [
  { tier: 4, min: 0.85 },
  { tier: 3, min: 0.70 },
  { tier: 2, min: 0.55 },
  { tier: 1, min: 0.40 },
  { tier: 0, min: -Infinity },
];

function rawTier(score: number): DtmQualityTier {
  if (!Number.isFinite(score)) return 0;
  for (const t of DTM_TIER_THRESHOLDS) if (score >= t.min) return t.tier;
  return 0;
}

export function dtmQualityTier(score: number): DtmQualityTier {
  return rawTier(score);
}

export function dtmQualityTierFromReport(report: DtmAffinityV6Report | null): DtmQualityTier {
  if (!report) return 0;
  const base = rawTier(report.score);
  const sparse = report.meStage === 'sparse' || report.candStage === 'sparse'
    || report.meStage === 'empty' || report.candStage === 'empty';
  if (sparse && base > 0) return (base - 1) as DtmQualityTier;
  return base;
}

export function dtmQualityLabel(score: number): string {
  return DTM_TIER_LABELS[dtmQualityTier(score)];
}

export function bucketDtmByTier<T extends { dtmScore: number }>(
  items: T[],
): Record<DtmQualityTier, T[]> {
  const out: Record<DtmQualityTier, T[]> = { 4: [], 3: [], 2: [], 1: [], 0: [] };
  for (const it of items) out[dtmQualityTier(it.dtmScore)].push(it);
  return out;
}
