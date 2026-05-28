/**
 * v4 Collaborative Filtering — item-item neighbour lookup.
 *
 * Backed by CfNeighbourCache (built by the cf-neighbours worker loop). For
 * each user, the cache stores up to N candidate uidHashes with affinity
 * 0..1 derived from co-occurrence in swipe-right / match / msg-send graphs.
 *
 * This file owns only the scoring math; the cache populator lives in the
 * tracking-worker.
 */
import { logScale, clip01 } from './math';
import { registerAlgo } from './registry';
import { v5FeatureEnabled } from './flags';

export type CfNeighbour = { bHash: string; affinity: number; coCount: number };

/**
 * Convert a neighbour entry into a 0..100 score, with a small log-scaled
 * co-count boost so we prefer well-supported neighbours over thin ones.
 */
export function cfScoreV4(n: CfNeighbour | undefined): number {
  if (!n) return 0;
  const aff = clip01(n.affinity);
  const support = logScale(n.coCount, 100);
  return Math.round(100 * clip01(0.8 * aff + 0.2 * support));
}

/** v5 neighbour — includes a dwell weight 0..1 representing how much time
 *  the *shared* viewers spent on this candidate's profile (median dwell
 *  among the co-viewers, normalised to 1 at 8s). */
export type CfNeighbourV5 = CfNeighbour & { dwellWeight?: number };

/**
 * v5 — incorporates a dwell-weighted boost. Time spent on a profile is a
 * higher-signal action than a swipe-right (which can be impulsive), so the
 * v5 weights tilt 0.6 affinity / 0.2 support / 0.2 dwellWeight. When
 * dwellWeight is missing the formula degrades to (approx) v4.
 */
export function cfScoreV5(n: CfNeighbourV5 | undefined): number {
  if (!n) return 0;
  const aff = clip01(n.affinity);
  const support = logScale(n.coCount, 100);
  const dwell = clip01(n.dwellWeight ?? 0);
  // When dwell is missing, redistribute its 0.2 weight back onto affinity
  // so the score does not silently drop just because we lack the new
  // signal yet — preserves v5 ≥ v4 monotonicity.
  if (n.dwellWeight == null) {
    return Math.round(100 * clip01(0.8 * aff + 0.2 * support));
  }
  return Math.round(100 * clip01(0.6 * aff + 0.2 * support + 0.2 * dwell));
}

/** Dispatcher. */
export function cfScore(n: CfNeighbourV5 | undefined): number {
  return v5FeatureEnabled('cf') ? cfScoreV5(n) : cfScoreV4(n);
}

/** Bulk lookup: candHash → score. Unknown candidates score 0. */
export function cfScoresByHash(neighbours: CfNeighbourV5[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const n of neighbours) out.set(n.bHash, cfScore(n));
  return out;
}

registerAlgo({
  name: 'cf',
  surface: 'discover',
  usesEvents: ['discover.swipe', 'discover.match', 'msg.send', 'msg.read',
    'card.impression.100'],
  weights: { affinity: 0.8, support: 0.2 },
});
