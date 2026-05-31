/**
 * dtmPairBatch \u2014 Phase 17 DTM analog of `pairBatch`.
 *
 * Selects which (a, b) pairs the dtm-vector worker should (re)score with
 * `dtmAffinityV6`. Same shape as `buildPairBatch` but with DTM-specific
 * defaults (longer freshness window because DTM vectors change much more
 * slowly than discover signals).
 *
 * Eligibility precondition: both users must have a DTM vector covering
 * at least `minCoveredTopics` topics (caller supplies precomputed counts).
 *
 * Pure & deterministic.
 */
export type DtmPairBatchUser = {
  id: string;
  lastActiveAt: number;
  /** Number of DTM topics this user has answered (0..16). */
  coveredCount: number;
};

export type DtmPairBatchCacheEntry = {
  aId: string;
  bId: string;
  updatedAt: number;
};

export type DtmPairBatchOptions = {
  maxPairs?: number;
  freshMs?: number;
  /** Min covered topics required for both users. Default 4. */
  minCoveredTopics?: number;
  now?: number;
};

export type DtmPairBatchItem = { aId: string; bId: string };

const DEFAULT_FRESH_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DEFAULT_MAX_PAIRS = 2000;
const DEFAULT_MIN_COVERED = 4;

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function buildDtmPairBatch(
  users: DtmPairBatchUser[],
  cache: DtmPairBatchCacheEntry[],
  opts: DtmPairBatchOptions = {},
): DtmPairBatchItem[] {
  const maxPairs        = opts.maxPairs        ?? DEFAULT_MAX_PAIRS;
  const freshMs         = opts.freshMs         ?? DEFAULT_FRESH_MS;
  const minCoveredTopics= opts.minCoveredTopics?? DEFAULT_MIN_COVERED;
  const now             = opts.now             ?? Date.now();
  if (users.length < 2 || maxPairs <= 0) return [];

  const eligible = users.filter((u) => u.coveredCount >= minCoveredTopics);
  if (eligible.length < 2) return [];

  const fresh = new Set<string>();
  for (const c of cache) {
    if (now - c.updatedAt < freshMs) fresh.add(pairKey(c.aId, c.bId));
  }

  const sorted = [...eligible].sort((a, b) => b.lastActiveAt - a.lastActiveAt);

  const out: DtmPairBatchItem[] = [];
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
