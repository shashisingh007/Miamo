/**
 * Phase 17 — pair-batch selector.
 *
 * Pure function that picks which (a, b) pairs the tracking-worker should
 * (re)compute `pairCompatV6` for in a given window. We don't want to
 * recompute every pair every tick; the selector applies three filters:
 *
 *   1. Cap total pairs at `maxPairs` (default 5000).
 *   2. Skip pairs whose cache entry is younger than `freshMs` (default 6h).
 *   3. Prefer pairs whose users have been recently active (sortBy lastActive).
 *
 * Output is a deterministic list of {aId, bId} (with aId < bId lexically
 * so we never double-score the same unordered pair).
 */
export type PairBatchUser = {
  id: string;
  lastActiveAt: number; // epoch ms
};

export type PairBatchCacheEntry = {
  aId: string;
  bId: string;
  updatedAt: number; // epoch ms
};

export type PairBatchOptions = {
  maxPairs?: number;
  freshMs?: number;
  now?: number;
};

export type PairBatchItem = { aId: string; bId: string };

export function buildPairBatch(
  users: PairBatchUser[],
  cache: PairBatchCacheEntry[],
  opts: PairBatchOptions = {},
): PairBatchItem[] {
  const maxPairs = opts.maxPairs ?? 5000;
  const freshMs  = opts.freshMs  ?? 6 * 60 * 60 * 1000;
  const now      = opts.now      ?? Date.now();
  if (users.length < 2 || maxPairs <= 0) return [];

  // Normalise cache to a Set of fresh pair keys ("a|b" with a<b).
  const fresh = new Set<string>();
  for (const c of cache) {
    if (now - c.updatedAt < freshMs) fresh.add(pairKey(c.aId, c.bId));
  }

  // Sort users by recency desc so the densest pairs are produced first.
  const sorted = [...users].sort((a, b) => b.lastActiveAt - a.lastActiveAt);

  const out: PairBatchItem[] = [];
  outer: for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const [aId, bId] = sorted[i].id < sorted[j].id
        ? [sorted[i].id, sorted[j].id]
        : [sorted[j].id, sorted[i].id];
      const k = pairKey(aId, bId);
      if (fresh.has(k)) continue;
      out.push({ aId, bId });
      if (out.length >= maxPairs) break outer;
    }
  }
  return out;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}
