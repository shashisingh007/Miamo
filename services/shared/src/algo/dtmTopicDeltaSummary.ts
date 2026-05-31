/**
 * dtmTopicDeltaSummary \u2014 DTM Phase 16 vector-delta diff helper (pure).
 *
 * Given a "before" and "after" `DtmVector`, returns the per-topic change
 * (after - before) plus a ranked list of the largest movers in each
 * direction. Used to power "what changed since your last session" surfaces.
 */
import { DTM_TOPIC_KEYS, type DtmTopicKey } from './dtmTopics';

export type DtmTopicMove = {
  topicKey: DtmTopicKey;
  delta: number;
  before: number;
  after: number;
};

export type DtmTopicDeltaSummaryResult = {
  deltas: DtmTopicMove[];                 // length = 16
  topUp: DtmTopicMove[];
  topDown: DtmTopicMove[];
  totalAbsChange: number;
};

const N = DTM_TOPIC_KEYS.length;

export function computeDtmTopicDeltaSummary(
  before: Float32Array | ReadonlyArray<number>,
  after: Float32Array | ReadonlyArray<number>,
  topN = 3,
): DtmTopicDeltaSummaryResult {
  if (!before || !after || before.length !== N || after.length !== N) {
    return { deltas: [], topUp: [], topDown: [], totalAbsChange: 0 };
  }
  const top = Math.max(1, topN | 0);
  const deltas: DtmTopicMove[] = new Array(N);
  let totalAbs = 0;
  for (let i = 0; i < N; i++) {
    const b = Number.isFinite(before[i]) ? before[i] : 0;
    const a = Number.isFinite(after[i]) ? after[i] : 0;
    const d = a - b;
    deltas[i] = { topicKey: DTM_TOPIC_KEYS[i], delta: d, before: b, after: a };
    totalAbs += Math.abs(d);
  }
  const ups = deltas.filter((d) => d.delta > 0).sort((x, y) => y.delta - x.delta).slice(0, top);
  const downs = deltas.filter((d) => d.delta < 0).sort((x, y) => x.delta - y.delta).slice(0, top);
  return { deltas, topUp: ups, topDown: downs, totalAbsChange: totalAbs };
}
