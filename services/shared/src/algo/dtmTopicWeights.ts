/**
 * dtmTopicWeights \u2014 DTM Phase 16 per-user topic-importance vector.
 *
 * Not every user values the 16 DTM topics equally. A growth-focused user
 * weights "ambition" and "growth" higher; a family-builder weights
 * "family" and "future". We derive a 16-vector of l1-normalised weights
 * from two signals:
 *
 *   coveredMass  topics the user has answered carry baseline weight 1.0.
 *   feedbackBoost topics where the user reacted positively to compatibility
 *                  chips ("we both rank family high") get +0.5 each.
 *
 * The vector sums to 1.0 (l1-normalised) so callers can dot-product it
 * with per-topic delta arrays directly.
 *
 * Pure & deterministic.
 */
import { DTM_TOPIC_KEYS, type DtmTopicKey } from './dtmTopics';

export type DtmTopicWeightsInputs = {
  /** Coverage flags, one per topic in DTM_TOPIC_KEYS order. */
  covered: readonly boolean[];
  /** Topic keys the user gave positive feedback on. */
  positiveFeedbackTopics?: readonly DtmTopicKey[];
};

const FEEDBACK_BOOST = 0.5;

export function buildDtmTopicWeights(inp: DtmTopicWeightsInputs): Float32Array {
  const n = DTM_TOPIC_KEYS.length;
  const w = new Float32Array(n);
  const pos = new Set<string>(inp.positiveFeedbackTopics ?? []);

  for (let i = 0; i < n; i++) {
    const base = inp.covered[i] ? 1.0 : 0.25;       // uncovered still carry signal but quartered
    const boost = pos.has(DTM_TOPIC_KEYS[i]) ? FEEDBACK_BOOST : 0;
    w[i] = base + boost;
  }

  let sum = 0;
  for (let i = 0; i < n; i++) sum += w[i];
  if (sum > 0) {
    const inv = 1 / sum;
    for (let i = 0; i < n; i++) w[i] *= inv;
  } else {
    // Degenerate fallback: uniform.
    const uni = 1 / n;
    for (let i = 0; i < n; i++) w[i] = uni;
  }
  return w;
}

/** Apply per-user topic weights to a per-topic delta array of the same shape. */
export function applyTopicWeights(deltas: Float32Array, weights: Float32Array): number {
  const n = Math.min(deltas.length, weights.length);
  let acc = 0;
  for (let i = 0; i < n; i++) acc += deltas[i] * weights[i];
  return acc;
}
