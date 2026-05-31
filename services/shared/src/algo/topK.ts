/**
 * Phase 15 S2 \u2014 recall top-K with tie-breaker.
 *
 * Pure selector: keep the top K items by a numeric key with deterministic
 * tie-breaking on a secondary id field. Used by the discover pipeline's
 * recall stage and by any v6 surface that needs a stable "top N" cut.
 *
 *   - O(n log n) sort \u2014 fine for the n<=10k discover pool.
 *   - Stable across runs: ties broken by `id` ascending.
 *   - Never mutates input.
 */

export type TopKItem = {
  id: string;
  score: number;
};

export type TopKOptions = {
  /** Items below this score are filtered out *before* the cut. Default -Infinity. */
  minScore?: number;
  /** Ascending instead of descending. Default false (descending). */
  ascending?: boolean;
};

export function topK<T extends TopKItem>(items: T[], k: number, opts: TopKOptions = {}): T[] {
  if (k <= 0) return [];
  const min = opts.minScore ?? -Infinity;
  const dir = opts.ascending ? 1 : -1;

  const filtered = items.filter((x) => Number.isFinite(x.score) && x.score >= min);
  const sorted = [...filtered].sort((a, b) => {
    if (a.score !== b.score) return dir * (a.score - b.score);
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  return sorted.slice(0, Math.min(k, sorted.length));
}

/** Convenience: top-K as a percent of the input length (clamped to [1, len]). */
export function topPercent<T extends TopKItem>(items: T[], pct: number, opts: TopKOptions = {}): T[] {
  if (items.length === 0 || pct <= 0) return [];
  const k = Math.max(1, Math.min(items.length, Math.ceil(items.length * Math.min(1, pct))));
  return topK(items, k, opts);
}
