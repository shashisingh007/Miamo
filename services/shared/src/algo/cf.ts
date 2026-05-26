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

export type CfNeighbour = { bHash: string; affinity: number; coCount: number };

/**
 * Convert a neighbour entry into a 0..100 score, with a small log-scaled
 * co-count boost so we prefer well-supported neighbours over thin ones.
 */
export function cfScore(n: CfNeighbour | undefined): number {
  if (!n) return 0;
  const aff = clip01(n.affinity);
  const support = logScale(n.coCount, 100);
  return Math.round(100 * clip01(0.8 * aff + 0.2 * support));
}

/** Bulk lookup: candHash → score. Unknown candidates score 0. */
export function cfScoresByHash(neighbours: CfNeighbour[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const n of neighbours) out.set(n.bHash, cfScore(n));
  return out;
}

registerAlgo({
  name: 'cf',
  surface: 'discover',
  usesEvents: ['discover.swipe', 'discover.match', 'msg.send', 'msg.read'],
  weights: { affinity: 0.8, support: 0.2 },
});
