/**
 * notifPriority \u2014 Phase 17 outbound notification priority score.
 *
 * Maps a candidate notification to a single score in [0, 1] used by the
 * scheduler to decide drop-order when the user is at their send cap.
 * Higher = more important; lower notifications are dropped first.
 *
 * Composed from three pure signals:
 *   categoryWeight  per-category base in [0, 1] (caller-supplied table).
 *   freshness       e^(-ageMin / 60)            \u2014 stale events lose value.
 *   actionability   binary: 1.0 if hasDeepLink, else 0.6.
 *
 *   priority = clamp01(0.5 * categoryWeight + 0.3 * freshness + 0.2 * actionability)
 */
export type NotifPriorityInputs = {
  category: string;
  /** Minutes since the underlying event happened. */
  ageMinutes: number;
  /** True if the notification will take the user to a specific screen. */
  hasDeepLink: boolean;
};

export type NotifPriorityConfig = {
  /** Per-category base weight in [0, 1]. */
  categoryWeights: Record<string, number>;
  /** Used when category is missing from the table. Default 0.4. */
  defaultCategoryWeight?: number;
};

const DEFAULT_CATEGORY_WEIGHT = 0.4;

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

export function notifPriority(inp: NotifPriorityInputs, cfg: NotifPriorityConfig): number {
  const base = cfg.categoryWeights[inp.category];
  const cat = clamp01(typeof base === 'number' ? base : (cfg.defaultCategoryWeight ?? DEFAULT_CATEGORY_WEIGHT));
  const age = Math.max(0, Number.isFinite(inp.ageMinutes) ? inp.ageMinutes : 0);
  const freshness = Math.exp(-age / 60);
  const action = inp.hasDeepLink ? 1.0 : 0.6;
  return clamp01(0.5 * cat + 0.3 * freshness + 0.2 * action);
}

/** Sort candidates desc by priority, returning a *new* array. Stable: ties
 *  keep the input order so the scheduler's secondary policy (e.g. fairness
 *  rotation) is not disturbed. */
export function sortByPriorityDesc<T extends NotifPriorityInputs>(
  xs: readonly T[], cfg: NotifPriorityConfig,
): T[] {
  return xs
    .map((x, i) => ({ x, i, p: notifPriority(x, cfg) }))
    .sort((a, b) => (b.p - a.p) || (a.i - b.i))
    .map((r) => r.x);
}
