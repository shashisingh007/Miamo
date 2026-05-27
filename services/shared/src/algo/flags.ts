/**
 * Surface-level v4 enable flags.
 *
 * Each surface (discover / messaging / beats / notifications / search /
 * feed / aiMatch) reads `ALGO_V4_RANK_ENABLED_<surface>` independently so we
 * can ramp the rollout one surface at a time. Default off (legacy path).
 *
 * Usage in a service:
 *   import { v4RankEnabled } from '@miamo/shared/algo/flags';
 *   if (v4RankEnabled('discover')) { use new rankForYou } else { legacy }
 */
export type V4Surface = 'discover' | 'messaging' | 'beats' | 'notifications' | 'search' | 'feed' | 'aiMatch' | 'deepCompat';

export function v4RankEnabled(surface: V4Surface): boolean {
  const key = `ALGO_V4_RANK_ENABLED_${surface.toUpperCase()}`;
  return process.env[key] === '1';
}

export function v4WorkersEnabled(): boolean {
  return process.env.ALGO_V4_WORKERS_ENABLED === '1';
}

/** v5 feature-level flags. Each one toggles a single algorithm-level
 *  improvement (new weighted terms, new penalties) and defaults off so
 *  rollout is per-feature, not per-surface. */
export type V5Feature =
  | 'forYou'                  // attentionFit + hesitationFit + regret/repeat/return adjustments
  | 'aiPicks'                 // returnRate as ensemble term
  | 'postImpressionRerank'    // dwell-aware re-rank of the next batch
  | 'active'                  // smooth decay over lastActivityAt
  | 'notifyTiming'            // per-user daily cap + idle-aware
  | 'messageSuggest'          // typing-pattern-aware opener ranking
  | 'cf'                      // dwell-weighted collaborative filter
  | 'searchAugment'           // search.no_results penalty + search.result_click boost
  | 'feedAugment'             // filter.* into rerank
  // Dispatcher-only v5 reservations (logic identical to v4 today; reserves
  // a flag so we can swap in tuned behaviour without another deploy).
  | 'new'
  | 'verified'
  | 'serious'
  | 'dtm'
  | 'moves'
  | 'aiMatch'
  | 'beats';

export function v5FeatureEnabled(feature: V5Feature): boolean {
  const key = `ALGO_V5_${feature.replace(/[A-Z]/g, (m) => '_' + m).toUpperCase()}_ENABLED`;
  return process.env[key] === '1';
}

/** For dashboards / debug endpoints. */
export function v4FlagSnapshot(): Record<string, boolean> {
  const surfaces: V4Surface[] = ['discover', 'messaging', 'beats', 'notifications', 'search', 'feed', 'aiMatch', 'deepCompat'];
  const out: Record<string, boolean> = { workers: v4WorkersEnabled() };
  for (const s of surfaces) out[s] = v4RankEnabled(s);
  return out;
}
