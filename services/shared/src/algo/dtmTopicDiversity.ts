/**
 * dtmTopicDiversity \u2014 Phase 16 DTM analog of `diversityBoost`.
 *
 * Looks at the user's recent DTM-driven match interactions (which topic
 * was the *dominant contributor* per match). If the last N dominant
 * topics are all the same (e.g. always "values"), boost a diversity
 * coefficient so the deep-compat ranker promotes matches whose strength
 * lies in different topics.
 *
 *   - history all-same, n>=5  \u2192 boost 1.3
 *   - top topic ratio >= 0.8  \u2192 boost 1.15
 *   - else                    \u2192 boost 1.0
 *
 * Pure. Multiplier capped at 1.5.
 */
import type { DtmTopicKey } from './dtmTopics';

export type DtmTopicDiversityInputs = {
  /** Most-recent-first or oldest-first; order doesn't matter. */
  recentDominantTopics: DtmTopicKey[];
};

export type DtmTopicDiversityBoost = {
  multiplier: number;
  reason: 'all_same' | 'dominant' | 'balanced' | 'insufficient_data';
  dominantTopic: DtmTopicKey | null;
};

const MIN_SAMPLE = 5;
const DOMINANCE_THRESHOLD = 0.8;
const BOOST_ALL_SAME = 1.3;
const BOOST_DOMINANT = 1.15;
const MAX_BOOST = 1.5;

export function dtmTopicDiversityBoost(
  inp: DtmTopicDiversityInputs,
): DtmTopicDiversityBoost {
  const arr = inp.recentDominantTopics ?? [];
  const n = arr.length;
  if (n < MIN_SAMPLE) {
    return { multiplier: 1.0, reason: 'insufficient_data', dominantTopic: null };
  }

  const counts: Partial<Record<DtmTopicKey, number>> = {};
  for (const t of arr) counts[t] = (counts[t] ?? 0) + 1;

  let topTopic: DtmTopicKey | null = null;
  let topCount = 0;
  for (const [k, v] of Object.entries(counts)) {
    if ((v ?? 0) > topCount) { topCount = v ?? 0; topTopic = k as DtmTopicKey; }
  }
  const ratio = topCount / n;

  let multiplier = 1.0;
  let reason: DtmTopicDiversityBoost['reason'] = 'balanced';
  if (topCount === n)                    { multiplier = BOOST_ALL_SAME; reason = 'all_same'; }
  else if (ratio >= DOMINANCE_THRESHOLD) { multiplier = BOOST_DOMINANT; reason = 'dominant'; }

  return {
    multiplier: Math.min(MAX_BOOST, multiplier),
    reason,
    dominantTopic: topTopic,
  };
}
