/**
 * v6 quality-band classifier — Phase 17 surface UX glue.
 *
 * Discrete tiers that the discover/messaging/notifications surfaces use to
 * decide UI affordances ("show 'great match' chip", "promote to top of
 * notifications digest", etc.). Pure: no DB.
 *
 *   tier 4  "exceptional"  v6Score >= 0.85
 *   tier 3  "great"        v6Score >= 0.70
 *   tier 2  "good"         v6Score >= 0.55
 *   tier 1  "fair"         v6Score >= 0.40
 *   tier 0  "cold"         v6Score <  0.40
 *
 * Bands intentionally have ~0.15 separation so per-user variance in
 * weights/posteriors doesn't ping-pong cards between tiers.
 */

export type QualityTier = 0 | 1 | 2 | 3 | 4;

export const TIER_LABELS: Record<QualityTier, string> = {
  4: 'exceptional',
  3: 'great',
  2: 'good',
  1: 'fair',
  0: 'cold',
};

export const TIER_THRESHOLDS: Array<{ tier: QualityTier; min: number }> = [
  { tier: 4, min: 0.85 },
  { tier: 3, min: 0.70 },
  { tier: 2, min: 0.55 },
  { tier: 1, min: 0.40 },
  { tier: 0, min: -Infinity },
];

/** Map a v6Score in [0, 1] to its quality tier (0..4). */
export function qualityTier(score: number): QualityTier {
  if (!Number.isFinite(score)) return 0;
  for (const t of TIER_THRESHOLDS) if (score >= t.min) return t.tier;
  return 0;
}

export function qualityLabel(score: number): string {
  return TIER_LABELS[qualityTier(score)];
}

/** Group an array of scored items by tier (descending). Useful for surface
 *  rendering ("Top picks today" = tier >= 3, "Worth a look" = tier 2). */
export function bucketByTier<T extends { v6Score: number }>(items: T[]): Record<QualityTier, T[]> {
  const out: Record<QualityTier, T[]> = { 4: [], 3: [], 2: [], 1: [], 0: [] };
  for (const it of items) out[qualityTier(it.v6Score)].push(it);
  return out;
}

/* ---------------------------------------------------------------------- */
/* v6 ranker output validator — Phase 17 safety net.                       */
/* ---------------------------------------------------------------------- */

export type RankerOutput = {
  id: string;
  score: number;
};

export type ValidationIssue =
  | { kind: 'nan'; id: string }
  | { kind: 'out_of_range'; id: string; score: number }
  | { kind: 'duplicate_id'; id: string }
  | { kind: 'all_zero' }
  | { kind: 'all_clipped'; ids: string[] };

/** Returns an array of issues. Empty array = output is healthy. */
export function validateRankerOutput(items: RankerOutput[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();
  let zeroCount = 0;
  const clipped: string[] = [];

  for (const it of items) {
    if (!Number.isFinite(it.score)) issues.push({ kind: 'nan', id: it.id });
    else if (it.score < 0 || it.score > 100) issues.push({ kind: 'out_of_range', id: it.id, score: it.score });
    if (seen.has(it.id)) issues.push({ kind: 'duplicate_id', id: it.id });
    seen.add(it.id);
    if (it.score === 0) zeroCount += 1;
    if (it.score === 100) clipped.push(it.id);
  }

  if (items.length > 0 && zeroCount === items.length) issues.push({ kind: 'all_zero' });
  if (items.length >= 3 && clipped.length === items.length) issues.push({ kind: 'all_clipped', ids: clipped });

  return issues;
}
