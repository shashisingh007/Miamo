/**
 * dtmTopicSimilarity \u2014 DTM Phase 16 per-topic similarity contributions (pure).
 *
 * Given two l2-normalised `DtmVector` (Float32Array length 16), reports
 * overall cosine plus per-topic dot contributions so UI can explain
 * "you matched on values + intimacy".
 */
import { DTM_TOPIC_KEYS, type DtmTopicKey } from './dtmTopics';

export type DtmTopicContribution = {
  topicKey: DtmTopicKey;
  contribution: number; // a[i] * b[i]
};

export type DtmSimilarityResult = {
  cosine: number; // -1..1 (assumes inputs already l2-normalised)
  topContributions: DtmTopicContribution[];
};

export function computeDtmTopicSimilarity(
  a: Float32Array | ReadonlyArray<number>,
  b: Float32Array | ReadonlyArray<number>,
  topN = 3,
): DtmSimilarityResult {
  const N = DTM_TOPIC_KEYS.length;
  if (!a || !b || a.length !== N || b.length !== N) {
    return { cosine: 0, topContributions: [] };
  }
  const contribs: DtmTopicContribution[] = [];
  let sum = 0;
  for (let i = 0; i < N; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (!Number.isFinite(av) || !Number.isFinite(bv)) continue;
    const c = av * bv;
    sum += c;
    contribs.push({ topicKey: DTM_TOPIC_KEYS[i], contribution: c });
  }
  contribs.sort((x, y) => y.contribution - x.contribution);
  const n = Math.max(0, Math.min(topN | 0, contribs.length));
  return { cosine: sum, topContributions: contribs.slice(0, n) };
}
