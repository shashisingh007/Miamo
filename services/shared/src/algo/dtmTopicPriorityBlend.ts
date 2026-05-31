/**
 * dtmTopicPriorityBlend \u2014 DTM Phase 16 next-question priority blender (pure).
 *
 * Combines the three per-topic signals shipped earlier
 *   - recency weight (`dtmTopicRecency`)
 *   - momentum      (`dtmTopicMomentum`)
 *   - per-topic confidence
 * into a single 0..1 priority used by the next-question selector to
 * decide which topic to ask about next.
 *
 *   priority = wRec*recency + wMom*max(0,-momentum) + wConfGap*(1-confidence)
 *
 * Negative momentum (topic cooling) and low confidence both *raise*
 * priority. Weights default to equal thirds and are normalised.
 */
import { DTM_TOPIC_KEYS, type DtmTopicKey } from './dtmTopics';

export type TopicPrioritySignals = {
  recency: number;     // 0..1 (stale -> 1)
  momentum: number;    // -1..1
  confidence: number;  // 0..1
};

export type TopicPriorityWeights = {
  recencyWeight?: number;
  momentumWeight?: number;
  confidenceGapWeight?: number;
};

export type TopicPriority = { topicKey: DtmTopicKey; priority: number };

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return x <= 0 ? 0 : x >= 1 ? 1 : x;
}

export function blendDtmTopicPriority(
  signals: Partial<Record<DtmTopicKey, TopicPrioritySignals>>,
  weights: TopicPriorityWeights = {},
): TopicPriority[] {
  const wR = Math.max(0, weights.recencyWeight ?? 1);
  const wM = Math.max(0, weights.momentumWeight ?? 1);
  const wC = Math.max(0, weights.confidenceGapWeight ?? 1);
  const sumW = wR + wM + wC || 1;

  const out: TopicPriority[] = [];
  for (const k of DTM_TOPIC_KEYS) {
    const s = signals[k];
    if (!s) continue;
    const rec = clamp01(s.recency);
    const cooling = clamp01(-s.momentum); // only negative momentum boosts priority
    const gap = clamp01(1 - clamp01(s.confidence));
    const priority = (wR * rec + wM * cooling + wC * gap) / sumW;
    out.push({ topicKey: k, priority });
  }
  out.sort((a, b) => b.priority - a.priority);
  return out;
}
