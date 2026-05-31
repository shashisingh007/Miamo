/**
 * dtmTopicHints \u2014 DTM Phase 11 surface-side chip-hint selector.
 *
 * Given the *caller's* DTM vector + the candidate's DTM vector + the
 * caller's per-topic importance weights (from `dtmTopicWeights`), pick
 * the top-K topics to surface as compatibility chips in the UI:
 *
 *   "You both rank family high"
 *   "Aligned on growth"
 *
 * Score per topic = weight * agreement, where:
 *   agreement = 1 - |meValue - candValue|   (both already l2-normalised
 *                                            so values are in [-1, 1])
 *
 * Returns topics sorted by score desc, capped at `maxHints`. Pure.
 */
import { DTM_TOPIC_KEYS, type DtmTopicKey } from './dtmTopics';

export type DtmTopicHint = {
  topic: DtmTopicKey;
  score: number;     // 0..1
};

export type DtmTopicHintsInputs = {
  /** Caller vector, length 16. */
  me: Float32Array;
  /** Candidate vector, length 16. */
  cand: Float32Array;
  /** Per-topic importance weights, length 16, sums to 1. */
  weights: Float32Array;
  /** Max number of chips to surface. Default 3. */
  maxHints?: number;
  /** Min score required for a topic to be surfaced. Default 0.20. */
  minScore?: number;
};

export function buildDtmTopicHints(inp: DtmTopicHintsInputs): DtmTopicHint[] {
  const max = Math.max(1, inp.maxHints ?? 3);
  const min = inp.minScore ?? 0.60;
  const n = Math.min(inp.me.length, inp.cand.length, inp.weights.length, DTM_TOPIC_KEYS.length);
  const all: Array<DtmTopicHint & { _sort: number }> = [];
  for (let i = 0; i < n; i++) {
    const agreement = 1 - Math.min(2, Math.abs(inp.me[i] - inp.cand[i])) / 2; // 0..1
    if (agreement < min) continue;
    const salience = inp.weights[i] * agreement; // used for ranking only
    all.push({ topic: DTM_TOPIC_KEYS[i], score: agreement, _sort: salience });
  }
  return all
    .sort((a, b) => (b._sort - a._sort) || (a.topic < b.topic ? -1 : 1))
    .slice(0, max)
    .map(({ topic, score }) => ({ topic, score }));
}
