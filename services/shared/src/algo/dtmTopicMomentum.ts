/**
 * dtmTopicMomentum \u2014 DTM Phase 16 short-window topic momentum (pure).
 *
 * Given a chronological list of `{topicKey, weight, atMs}` answer events,
 * computes per-topic momentum on a recent window vs. the prior window.
 * Useful to surface "trending interests" or to bias next-question topics.
 */
import { DTM_TOPIC_KEYS, type DtmTopicKey } from './dtmTopics';

export type DtmAnswerEvent = { topicKey: DtmTopicKey; weight: number; atMs: number };

export type DtmTopicMomentum = {
  topicKey: DtmTopicKey;
  recent: number;       // summed weight in recent window
  prior: number;        // summed weight in prior window
  momentum: number;     // (recent - prior) / max(recent + prior, 1)  -> [-1..1]
};

export function computeDtmTopicMomentum(
  events: ReadonlyArray<DtmAnswerEvent>,
  opts: { nowMs: number; windowMs?: number },
): DtmTopicMomentum[] {
  const win = Math.max(1, opts.windowMs ?? 14 * 24 * 60 * 60 * 1000); // 14d default
  const recentFrom = opts.nowMs - win;
  const priorFrom = opts.nowMs - 2 * win;

  const recent = new Map<DtmTopicKey, number>();
  const prior = new Map<DtmTopicKey, number>();
  for (const ev of events) {
    if (!ev || typeof ev.atMs !== 'number') continue;
    if (!DTM_TOPIC_KEYS.includes(ev.topicKey)) continue;
    const w = Number.isFinite(ev.weight) && ev.weight > 0 ? ev.weight : 0;
    if (w === 0) continue;
    if (ev.atMs >= recentFrom && ev.atMs <= opts.nowMs) {
      recent.set(ev.topicKey, (recent.get(ev.topicKey) ?? 0) + w);
    } else if (ev.atMs >= priorFrom && ev.atMs < recentFrom) {
      prior.set(ev.topicKey, (prior.get(ev.topicKey) ?? 0) + w);
    }
  }

  const out: DtmTopicMomentum[] = [];
  for (const k of DTM_TOPIC_KEYS) {
    const r = recent.get(k) ?? 0;
    const p = prior.get(k) ?? 0;
    if (r === 0 && p === 0) continue;
    const denom = r + p;
    const momentum = denom > 0 ? (r - p) / denom : 0;
    out.push({ topicKey: k, recent: r, prior: p, momentum });
  }
  // Sort by descending |momentum| then by recent weight for ties
  out.sort((a, b) => Math.abs(b.momentum) - Math.abs(a.momentum) || b.recent - a.recent);
  return out;
}
