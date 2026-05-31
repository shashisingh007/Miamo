/**
 * dtmAnswerVarianceTracker \u2014 DTM Phase 16 running per-topic variance (pure).
 *
 * Maintains Welford-style online mean+variance per topic so the
 * confidence calibrator can read a stable consistency signal without
 * scanning the full answer history each refresh.
 */
import { DTM_TOPIC_KEYS, type DtmTopicKey } from './dtmTopics';

export type TopicVarianceState = {
  count: number;
  mean: number;
  m2: number;
};

export type DtmVarianceTracker = Partial<Record<DtmTopicKey, TopicVarianceState>>;

export function emptyVarianceTracker(): DtmVarianceTracker {
  return {};
}

export function updateVariance(
  tracker: DtmVarianceTracker,
  topicKey: DtmTopicKey,
  value: number,
): DtmVarianceTracker {
  if (!DTM_TOPIC_KEYS.includes(topicKey)) return tracker;
  if (!Number.isFinite(value)) return tracker;
  const prev = tracker[topicKey] ?? { count: 0, mean: 0, m2: 0 };
  const count = prev.count + 1;
  const delta = value - prev.mean;
  const mean = prev.mean + delta / count;
  const delta2 = value - mean;
  const m2 = prev.m2 + delta * delta2;
  return { ...tracker, [topicKey]: { count, mean, m2 } };
}

export function topicVariance(tracker: DtmVarianceTracker, topicKey: DtmTopicKey): number {
  const s = tracker[topicKey];
  if (!s || s.count < 2) return 0;
  return s.m2 / (s.count - 1); // sample variance
}

export function meanVariance(tracker: DtmVarianceTracker): number {
  let sum = 0;
  let n = 0;
  for (const k of DTM_TOPIC_KEYS) {
    const s = tracker[k];
    if (s && s.count >= 2) {
      sum += s.m2 / (s.count - 1);
      n++;
    }
  }
  return n > 0 ? sum / n : 0;
}
