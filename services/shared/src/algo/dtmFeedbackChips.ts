/**
 * dtmFeedbackChips \u2014 Phase 16 DTM analog of `feedbackChips`.
 *
 * Records user feedback on a DTM-driven match into a normalised observation
 * the dtm-vector worker can consume. Each chip is a (topic, sentiment) pair
 * the user tapped:
 *
 *   - 'shared'   \u2014 "we both care about X" \u2192 reinforce topic weight
 *   - 'starter'  \u2014 "great conversation starter" \u2192 reinforce starter-bonus
 *   - 'mismatch' \u2014 "we disagree on X" \u2192 dampen topic weight
 *
 * Pure module: returns a `DtmFeedbackObservation` for the caller to enqueue.
 */
import type { DtmTopicKey } from './dtmTopics';

export type DtmChipSentiment = 'shared' | 'starter' | 'mismatch';

export type DtmFeedbackInput = {
  uidHash: string;
  pairUidHash: string;
  topic: DtmTopicKey;
  sentiment: DtmChipSentiment;
  timestamp?: number;
};

export type DtmFeedbackObservation = {
  uidHash: string;
  pairUidHash: string;
  topic: DtmTopicKey;
  sentiment: DtmChipSentiment;
  delta: number;
  timestamp: number;
};

const DELTA_TABLE: Record<DtmChipSentiment, number> = {
  shared:   +0.10,
  starter:  +0.05,
  mismatch: -0.10,
};

export function recordDtmFeedback(inp: DtmFeedbackInput): DtmFeedbackObservation {
  const delta = DELTA_TABLE[inp.sentiment];
  return {
    uidHash: inp.uidHash,
    pairUidHash: inp.pairUidHash,
    topic: inp.topic,
    sentiment: inp.sentiment,
    delta,
    timestamp: inp.timestamp ?? Date.now(),
  };
}

/** Aggregate a batch of feedback into per-topic net deltas for the asker. */
export function aggregateDtmFeedback(
  observations: DtmFeedbackObservation[],
): Partial<Record<DtmTopicKey, number>> {
  const out: Partial<Record<DtmTopicKey, number>> = {};
  for (const o of observations) {
    out[o.topic] = (out[o.topic] ?? 0) + o.delta;
  }
  return out;
}
