/**
 * Phase 13/14 — v6 system-health diagnostic.
 *
 * Run-time sanity check that nothing in the v6 stack has drifted out of
 * spec. Used by:
 *   - CI guard (fails build if invariants violated)
 *   - `/v1/health/v6` debug endpoint for on-call
 *
 * Checks today:
 *   1. forYouV6 weights sum to 1.000 ± 1e-9
 *   2. pairCompatV6 static weights sum to 1.000 ± 1e-9
 *   3. learner default weights sum to 1.000 ± 1e-9
 *   4. All forYouV6 ingredient keys are present in learner.WeightKey
 *   5. Penalty caps are non-negative
 */
import { FORYOU_V6_WEIGHTS, FORYOU_V6_PENALTIES } from './forYouV6';
import { PAIR_V6_STATIC_WEIGHTS } from './pairCompatV6';
import { defaultProfile } from './learner';

export type HealthIssue = { code: string; detail: string };
export type HealthReport = { healthy: boolean; issues: HealthIssue[] };

const EPS = 1e-9;

export function v6HealthCheck(): HealthReport {
  const issues: HealthIssue[] = [];

  const sumForYou = sumOf(FORYOU_V6_WEIGHTS);
  if (Math.abs(sumForYou - 1) > EPS) {
    issues.push({ code: 'forYouV6_weights_not_normalised', detail: `sum=${sumForYou}` });
  }

  const sumPair = sumOf(PAIR_V6_STATIC_WEIGHTS);
  if (Math.abs(sumPair - 1) > EPS) {
    issues.push({ code: 'pairCompatV6_weights_not_normalised', detail: `sum=${sumPair}` });
  }

  const learnerWeights = defaultProfile().weights;
  const sumLearner = sumOf(learnerWeights);
  if (Math.abs(sumLearner - 1) > EPS) {
    issues.push({ code: 'learner_default_weights_not_normalised', detail: `sum=${sumLearner}` });
  }

  const learnerKeys = new Set(Object.keys(learnerWeights));
  for (const k of Object.keys(FORYOU_V6_WEIGHTS)) {
    if (!learnerKeys.has(k)) {
      issues.push({ code: 'forYouV6_key_missing_from_learner', detail: k });
    }
  }

  for (const [k, v] of Object.entries(FORYOU_V6_PENALTIES)) {
    if (typeof v === 'number' && v < 0) {
      issues.push({ code: 'penalty_cap_negative', detail: `${k}=${v}` });
    }
  }

  return { healthy: issues.length === 0, issues };
}

function sumOf(rec: Record<string, number>): number {
  let s = 0;
  for (const v of Object.values(rec)) s += v;
  return s;
}
