/**
 * dtmTopicLiftRanker \u2014 DTM Phase 16 next-question lift ranker (pure).
 *
 * Given the current per-topic answer counts and a list of candidate
 * questions (each tagged with the topics it informs), rank candidates by
 * their expected information lift. A question informing under-served
 * topics has higher lift than one informing already-strong topics.
 *
 *   topicLift(answers) = 1 / (answers + 1)
 *   questionLift       = average of topicLift across its tagged topics
 *
 * Returns the candidates re-ordered desc by lift.
 */
import { DTM_TOPIC_KEYS, type DtmTopicKey } from './dtmTopics';

export type DtmLiftCandidate = {
  id: string;
  topics: ReadonlyArray<DtmTopicKey>;
};

export type DtmLiftRanked = DtmLiftCandidate & {
  lift: number;
  rank: number;
};

const N = DTM_TOPIC_KEYS.length;
const INDEX = new Map<DtmTopicKey, number>(
  DTM_TOPIC_KEYS.map((k, i) => [k, i]),
);

export function rankDtmCandidatesByLift(
  candidates: ReadonlyArray<DtmLiftCandidate>,
  answersPerTopic: ReadonlyArray<number>,
): DtmLiftRanked[] {
  if (!Array.isArray(candidates) || candidates.length === 0) return [];
  const counts = new Array<number>(N).fill(0);
  if (answersPerTopic && answersPerTopic.length === N) {
    for (let i = 0; i < N; i++) {
      const v = answersPerTopic[i];
      counts[i] = Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
    }
  }

  const scored = candidates.map((c) => {
    const topics = (c.topics ?? ([] as ReadonlyArray<DtmTopicKey>)).filter((t: DtmTopicKey) => INDEX.has(t));
    if (topics.length === 0) return { ...c, lift: 0 };
    let sum = 0;
    for (const t of topics) sum += 1 / (counts[INDEX.get(t)!] + 1);
    return { ...c, lift: sum / topics.length };
  });

  scored.sort((a, b) => b.lift - a.lift);
  return scored.map((s, i) => ({ ...s, rank: i + 1 }));
}
