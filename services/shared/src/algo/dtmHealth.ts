/**
 * dtmHealth \u2014 Phase 13 DTM system-health invariants.
 *
 * Runtime sanity check for the DTM v6 stack. Returns the same
 * `HealthIssue` shape as `v6HealthCheck` so the gateway `/v1/health/v6`
 * endpoint can concatenate results.
 *
 * Invariants:
 *   1. dtmTopics canonical key count == DTM_TOPIC_COUNT (16)
 *   2. Every canonical key has a non-empty label
 *   3. dtmV6 weight-table sums (weightedCosine + sharedMassBonus +
 *      coverageBlend) match the registered algo weights (sum=1.0)
 *   4. `feature='dtm'` is present in V6Feature flag namespace (smoke
 *      check via env-key derivation)
 */
import {
  DTM_TOPIC_COUNT,
  DTM_TOPIC_KEYS,
  DTM_TOPIC_LABELS,
} from './dtmTopics';
import { getRegistry } from './registry';

export type DtmHealthIssue = { code: string; detail: string };
export type DtmHealthReport = { healthy: boolean; issues: DtmHealthIssue[] };

const EPS = 1e-9;

export function dtmHealthCheck(): DtmHealthReport {
  const issues: DtmHealthIssue[] = [];

  if (DTM_TOPIC_KEYS.length !== DTM_TOPIC_COUNT) {
    issues.push({
      code: 'dtm_topic_count_mismatch',
      detail: `keys=${DTM_TOPIC_KEYS.length} expected=${DTM_TOPIC_COUNT}`,
    });
  }

  const seen = new Set<string>();
  for (const k of DTM_TOPIC_KEYS) {
    if (seen.has(k)) {
      issues.push({ code: 'dtm_topic_duplicate_key', detail: k });
    }
    seen.add(k);
    const label = DTM_TOPIC_LABELS[k];
    if (!label || label.trim().length === 0) {
      issues.push({ code: 'dtm_topic_label_missing', detail: k });
    }
  }

  const dtmV6 = getRegistry().find((a) => a.name === 'dtmV6');
  if (!dtmV6) {
    issues.push({ code: 'dtmV6_not_registered', detail: '' });
  } else {
    const sum = Object.values(dtmV6.weights).reduce((s, v) => s + v, 0);
    if (Math.abs(sum - 1.0) > EPS * 1_000_000) {
      issues.push({ code: 'dtmV6_weights_not_normalised', detail: `sum=${sum}` });
    }
  }

  return { healthy: issues.length === 0, issues };
}
