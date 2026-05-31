/**
 * dtmTopicGap \u2014 DTM Phase 16 per-topic coverage gap (pure).
 *
 * Given per-topic answer counts and a global target budget, identifies
 * topics that are below their fair share. Used by the next-question
 * selector to push the user toward a balanced DTM profile.
 *
 *   fairShare = totalAnswers / numTopics  (or explicit target)
 *   gap       = max(0, fairShare - count) / max(1, fairShare)   in [0,1]
 */
import { DTM_TOPIC_KEYS, type DtmTopicKey } from './dtmTopics';

export type DtmTopicGapResult = {
  topicKey: DtmTopicKey;
  count: number;
  gap: number;          // 0..1, higher = more under-answered
};

export function computeDtmTopicGap(
  counts: Partial<Record<DtmTopicKey, number>>,
  opts: { perTopicTarget?: number } = {},
): DtmTopicGapResult[] {
  const N = DTM_TOPIC_KEYS.length;
  let target = opts.perTopicTarget;
  if (target === undefined) {
    let total = 0;
    for (const k of DTM_TOPIC_KEYS) total += Math.max(0, counts[k] ?? 0);
    target = total / N;
  }
  target = Math.max(0, target);
  const out: DtmTopicGapResult[] = [];
  for (const k of DTM_TOPIC_KEYS) {
    const c = Math.max(0, counts[k] ?? 0);
    const denom = Math.max(1, target);
    const gap = Math.max(0, Math.min(1, (target - c) / denom));
    out.push({ topicKey: k, count: c, gap });
  }
  out.sort((a, b) => b.gap - a.gap || a.count - b.count);
  return out;
}
