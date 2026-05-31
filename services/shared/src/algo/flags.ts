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

/** v6 feature-level flags. Mirrors V5Feature but adds the learner +
 *  per-user weight profile + Miamo Move v3 archetype. Each defaults off. */
export type V6Feature =
  | 'forYou'
  | 'aiPicks'
  | 'postImpressionRerank'
  | 'active'
  | 'notifyTiming'
  | 'messageSuggest'
  | 'cf'
  | 'searchAugment'
  | 'feedAugment'
  | 'new'
  | 'verified'
  | 'serious'
  | 'dtm'
  | 'moves'
  | 'aiMatch'
  | 'beats'
  // v6 platform features (no v4/v5 ancestor)
  | 'learner'        // Phase 16 Thompson-sampling bandit
  | 'pairCompat'     // Phase 17 v6 pair-compat writer (parallel to v4)
  | 'discoverPolicy' // Phase 5 window-shopping defence / zero-action recovery
  | 'moveProfile';   // Phase 4 Miamo Move v3 archetype classifier

export function v6FeatureEnabled(feature: V6Feature): boolean {
  const key = `ALGO_V6_${feature.replace(/[A-Z]/g, (m) => '_' + m).toUpperCase()}_ENABLED`;
  return process.env[key] === '1';
}

/** Phase 15 cascading discover pipeline stages. */
export type PipelineStage = 'S1' | 'S2' | 'S3' | 'S4' | 'S5';

export function pipelineStageEnabled(stage: PipelineStage): boolean {
  return process.env[`PIPELINE_${stage}_ENABLED`] === '1';
}

/** Phase 2 master switch for the new total-state collectors. */
export function trackingTotalStateEnabled(): boolean {
  return process.env.TRACKING_TOTAL_STATE_ENABLED === '1';
}

/** For dashboards / debug endpoints. */
export function v4FlagSnapshot(): Record<string, boolean> {
  const surfaces: V4Surface[] = ['discover', 'messaging', 'beats', 'notifications', 'search', 'feed', 'aiMatch', 'deepCompat'];
  const out: Record<string, boolean> = { workers: v4WorkersEnabled() };
  for (const s of surfaces) out[s] = v4RankEnabled(s);
  return out;
}

/** For dashboards / debug endpoints — every v6 flag in one snapshot. */
export function v6FlagSnapshot(): Record<string, boolean> {
  const features: V6Feature[] = [
    'forYou', 'aiPicks', 'postImpressionRerank', 'active', 'notifyTiming',
    'messageSuggest', 'cf', 'searchAugment', 'feedAugment', 'new', 'verified',
    'serious', 'dtm', 'moves', 'aiMatch', 'beats',
    'learner', 'pairCompat', 'discoverPolicy', 'moveProfile',
  ];
  const out: Record<string, boolean> = {
    totalState: trackingTotalStateEnabled(),
    pipelineS1: pipelineStageEnabled('S1'),
    pipelineS2: pipelineStageEnabled('S2'),
    pipelineS3: pipelineStageEnabled('S3'),
    pipelineS4: pipelineStageEnabled('S4'),
    pipelineS5: pipelineStageEnabled('S5'),
  };
  for (const f of features) out[f] = v6FeatureEnabled(f);
  return out;
}
