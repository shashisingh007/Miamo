/**
 * dtmTopicRecency \u2014 DTM Phase 16 per-topic recency weights (pure).
 *
 * Given the last-answered-at time per topic, computes a 0..1 staleness
 * weight per topic suitable for biasing next-question selection toward
 * topics the user hasn't touched recently. Linear ramp from 0 at
 * `freshDays` to 1 at `staleDays`.
 */
import { DTM_TOPIC_KEYS, type DtmTopicKey } from './dtmTopics';

export type DtmRecencyInput = Partial<Record<DtmTopicKey, number>>; // topicKey -> lastAtMs

export type DtmTopicRecencyWeight = {
  topicKey: DtmTopicKey;
  daysSince: number;
  weight: number; // 0..1, higher = more stale = stronger candidate
};

export function computeDtmTopicRecency(
  lastAnsweredAt: DtmRecencyInput,
  opts: { nowMs: number; freshDays?: number; staleDays?: number },
): DtmTopicRecencyWeight[] {
  const fresh = Math.max(0, opts.freshDays ?? 3);
  const stale = Math.max(fresh + 0.001, opts.staleDays ?? 30);
  const DAY = 24 * 60 * 60 * 1000;
  const out: DtmTopicRecencyWeight[] = [];
  for (const k of DTM_TOPIC_KEYS) {
    const ts = lastAnsweredAt[k];
    if (ts === undefined) {
      out.push({ topicKey: k, daysSince: Infinity, weight: 1 });
      continue;
    }
    if (!Number.isFinite(ts)) continue;
    const days = Math.max(0, (opts.nowMs - ts) / DAY);
    let weight: number;
    if (days <= fresh) weight = 0;
    else if (days >= stale) weight = 1;
    else weight = (days - fresh) / (stale - fresh);
    out.push({ topicKey: k, daysSince: days, weight });
  }
  out.sort((a, b) => b.weight - a.weight);
  return out;
}
