/**
 * dtmTopicMix \u2014 DTM Phase 16 per-topic mass share (pure).
 *
 * Given a `DtmVector` (l2-normalised), reports each topic's share of
 * the total absolute mass (sum of |components|), sorted descending.
 * Useful for "your top interests" UI surfaces and explainability.
 */
import { DTM_TOPIC_KEYS, type DtmTopicKey } from './dtmTopics';

export type DtmTopicMixEntry = {
  topicKey: DtmTopicKey;
  share: number;     // 0..1, sums (across all topics) to <= 1
  signed: number;    // original signed component
};

export function computeDtmTopicMix(
  vector: Float32Array | ReadonlyArray<number>,
): DtmTopicMixEntry[] {
  const N = DTM_TOPIC_KEYS.length;
  if (!vector || vector.length !== N) return [];
  let total = 0;
  const abs: number[] = new Array(N);
  for (let i = 0; i < N; i++) {
    const v = Number.isFinite(vector[i]) ? vector[i] : 0;
    abs[i] = Math.abs(v);
    total += abs[i];
  }
  if (total <= 0) return DTM_TOPIC_KEYS.map((k, i) => ({ topicKey: k, share: 0, signed: vector[i] ?? 0 }));
  const out: DtmTopicMixEntry[] = [];
  for (let i = 0; i < N; i++) {
    out.push({ topicKey: DTM_TOPIC_KEYS[i], share: abs[i] / total, signed: Number.isFinite(vector[i]) ? vector[i] : 0 });
  }
  out.sort((a, b) => b.share - a.share);
  return out;
}

export function topNTopicMix(vector: Float32Array | ReadonlyArray<number>, n: number): DtmTopicMixEntry[] {
  const sorted = computeDtmTopicMix(vector);
  return sorted.slice(0, Math.max(0, n | 0));
}
