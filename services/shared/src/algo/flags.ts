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

/** v6.5 — per-surface learner ramp.
 *
 * Reads `ALGO_V6_LEARNER_RAMP_<SURFACE>` (e.g. `ALGO_V6_LEARNER_RAMP_DISCOVER`)
 * as a number in [0,1] and clamps. Default 0 — i.e. the learner-derived
 * weights have zero influence and the ranker uses defaultProfile() exactly
 * as it does today. Operators raise it to 0.05, 0.10, ... gradually.
 *
 * `applyLearnerRamp(defaultW, learnedW, ramp)` performs the blend:
 *   blended[k] = (1 - ramp) * defaultW[k] + ramp * learnedW[k]
 * and renormalises so the result sums to 1.0.
 */
export function learnerRamp(surface: string): number {
  const key = `ALGO_V6_LEARNER_RAMP_${surface.toUpperCase()}`;
  const raw = process.env[key];
  if (!raw) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/** Pure helper. Blend two weight maps by `ramp` and renormalise.
 *  When `ramp === 0`, returns a copy of `defaultW` (no behavioural change).
 *  When `ramp === 1`, returns a normalised copy of `learnedW`.
 *  Missing keys in `learnedW` fall back to the corresponding defaultW value. */
export function applyLearnerRamp(
  defaultW: Record<string, number>,
  learnedW: Record<string, number> | null | undefined,
  ramp: number,
): Record<string, number> {
  if (!learnedW || ramp <= 0) return { ...defaultW };
  const r = Math.max(0, Math.min(1, ramp));
  const blended: Record<string, number> = {};
  let sum = 0;
  for (const k of Object.keys(defaultW)) {
    const dw = defaultW[k];
    const lw = typeof learnedW[k] === 'number' ? learnedW[k] : dw;
    const v = (1 - r) * dw + r * lw;
    blended[k] = v < 0 ? 0 : v;
    sum += blended[k];
  }
  if (sum <= 0) return { ...defaultW };
  for (const k of Object.keys(blended)) blended[k] /= sum;
  return blended;
}

/** v9 — Temporal Learning v2 master switch.
 *
 * Controls the `services/tracking-worker/src/preferenceWindows.ts` loop
 * AND the v9 `noveltyDemand` / drift-signal ingredients in
 * `services/shared/src/algo/v8/multiObjective.ts`. Default OFF.
 *
 * Rollout plan (see docs/architecture/v9-temporal-learning.md):
 *   Week 1: flag=0                (dark ship — nothing observable)
 *   Week 2: flag=1 in staging     (worker populates rows; ranker ignores)
 *   Week 3: 10% prod ramp         (per-request random gate at the ranker)
 *   Week 4: 30% → 100% prod       (KPI thresholds must hold)
 *
 * // because: hard constraint #7 requires every new algorithm to ship
 * // behind a default-OFF flag with a documented ramp plan.
 */
export function v9TemporalLearningEnabled(): boolean {
  return process.env.ALGO_V9_TEMPORAL_LEARNING_ENABLED === '1';
}

/**
 * v9 Phase E — five NEW default-OFF flags for the companion algorithms
 * shipped alongside Temporal Learning v2. Each is independent (no
 * shared master switch) so ops can ramp them one at a time. When ALL
 * five are OFF, the multi-objective ranker output is bit-identical to
 * the prior version — asserted by tests/algo/flag-off-byte-identical.
 *
 * Flag → module:
 *   ALGO_V9_REPEAT_OFFENDER_ENABLED         → v9/repeatOffenderDetector
 *   ALGO_V9_CONVERSATION_STARTER_ENABLED    → v9/conversationStarter
 *   ALGO_V9_PROFILE_HEALTH_ENABLED          → v9/profileHealth
 *   ALGO_V9_MATCH_QUALITY_PREDICTOR_ENABLED → v9/matchQualityPredictor
 *   ALGO_V9_COMPATIBILITY_EXPLAINER_ENABLED → v9/compatibilityExplainer
 */
export function v9RepeatOffenderEnabled(): boolean {
  return process.env.ALGO_V9_REPEAT_OFFENDER_ENABLED === '1';
}
export function v9ConversationStarterEnabled(): boolean {
  return process.env.ALGO_V9_CONVERSATION_STARTER_ENABLED === '1';
}
export function v9ProfileHealthEnabled(): boolean {
  return process.env.ALGO_V9_PROFILE_HEALTH_ENABLED === '1';
}
export function v9MatchQualityPredictorEnabled(): boolean {
  return process.env.ALGO_V9_MATCH_QUALITY_PREDICTOR_ENABLED === '1';
}
export function v9CompatibilityExplainerEnabled(): boolean {
  return process.env.ALGO_V9_COMPATIBILITY_EXPLAINER_ENABLED === '1';
}

/** Snapshot every v9 Phase E flag in one object for the debug endpoint. */
export function v9FlagSnapshot(): Record<string, boolean> {
  return {
    temporalLearning:        v9TemporalLearningEnabled(),
    repeatOffender:          v9RepeatOffenderEnabled(),
    conversationStarter:     v9ConversationStarterEnabled(),
    profileHealth:           v9ProfileHealthEnabled(),
    matchQualityPredictor:   v9MatchQualityPredictorEnabled(),
    compatibilityExplainer:  v9CompatibilityExplainerEnabled(),
  };
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
