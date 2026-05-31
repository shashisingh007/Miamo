/**
 * dtmTopicCooccurrence \u2014 DTM Phase 16 topic-cluster surface (pure).
 *
 * For one user's answer history, returns the top-K topic pairs that
 * tend to be answered in the same session. Used by the UI to render
 * "you usually answer growth + ambition together" nudges and by the
 * learner to seed pair-priors.
 */
import { DTM_TOPIC_KEYS, type DtmTopicKey } from './dtmTopics';

export type DtmAnswerEvent = {
  sessionId: string;
  topic: DtmTopicKey;
};

export type DtmTopicPair = { a: DtmTopicKey; b: DtmTopicKey; count: number };

export type DtmCooccurInputs = {
  events: DtmAnswerEvent[];
  topK?: number;       // default 5
  minCount?: number;   // default 2
};

const N = DTM_TOPIC_KEYS.length;

export function topicCooccurrence(inp: DtmCooccurInputs): DtmTopicPair[] {
  const topK = Math.max(1, inp.topK ?? 5);
  const minCount = Math.max(1, inp.minCount ?? 2);

  const idxOf = new Map<DtmTopicKey, number>();
  DTM_TOPIC_KEYS.forEach((k, i) => idxOf.set(k, i));

  // Bucket per session -> set of topic indices
  const sessions = new Map<string, Set<number>>();
  for (const e of inp.events) {
    const i = idxOf.get(e.topic);
    if (i == null) continue;
    let s = sessions.get(e.sessionId);
    if (!s) { s = new Set(); sessions.set(e.sessionId, s); }
    s.add(i);
  }

  // Upper-triangular pair counts
  const counts = new Map<number, number>(); // key = a*N + b, a < b
  for (const s of sessions.values()) {
    const arr = [...s].sort((x, y) => x - y);
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const k = arr[i] * N + arr[j];
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
    }
  }

  const out: DtmTopicPair[] = [];
  for (const [k, c] of counts) {
    if (c < minCount) continue;
    out.push({ a: DTM_TOPIC_KEYS[Math.floor(k / N)], b: DTM_TOPIC_KEYS[k % N], count: c });
  }
  return out
    .sort((p, q) =>
      (q.count - p.count)
      || (DTM_TOPIC_KEYS.indexOf(p.a) - DTM_TOPIC_KEYS.indexOf(q.a))
      || (DTM_TOPIC_KEYS.indexOf(p.b) - DTM_TOPIC_KEYS.indexOf(q.b)),
    )
    .slice(0, topK);
}
