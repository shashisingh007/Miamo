/**
 * dtmTopicConfidenceBand \u2014 DTM Phase 16 per-topic confidence band (pure).
 *
 * Given per-topic answer counts and a global confidence threshold,
 * categorises each topic into a confidence tier and returns aggregate
 * coverage stats. Useful for surfacing "we don\u2019t know enough about X yet".
 *
 *   tiers:
 *     none   answers == 0
 *     weak   answers in [1, weakMax)              default weakMax  = 3
 *     fair   answers in [weakMax, fairMax)        default fairMax  = 7
 *     strong answers \u2265 fairMax
 *
 *   coverage = topicsWithAtLeastOne / N
 */
import { DTM_TOPIC_KEYS, type DtmTopicKey } from './dtmTopics';

export type DtmConfidenceBand = 'none' | 'weak' | 'fair' | 'strong';

export type DtmTopicConfidenceEntry = {
  topicKey: DtmTopicKey;
  answers: number;
  band: DtmConfidenceBand;
};

export type DtmTopicConfidenceResult = {
  entries: DtmTopicConfidenceEntry[];     // length N
  coverage: number;                       // 0..1
  weakest: DtmTopicConfidenceEntry[];     // lowest answers
  strongCount: number;
};

export type DtmTopicConfidenceOptions = {
  weakMax?: number;    // default 3
  fairMax?: number;    // default 7
  weakestN?: number;   // default 3
};

const N = DTM_TOPIC_KEYS.length;

export function computeDtmTopicConfidenceBand(
  answersPerTopic: ReadonlyArray<number>,
  opts: DtmTopicConfidenceOptions = {},
): DtmTopicConfidenceResult {
  const weakMax = Math.max(1, opts.weakMax ?? 3);
  const fairMax = Math.max(weakMax + 1, opts.fairMax ?? 7);
  const weakestN = Math.max(1, opts.weakestN ?? 3);

  if (!answersPerTopic || answersPerTopic.length !== N) {
    return { entries: [], coverage: 0, weakest: [], strongCount: 0 };
  }

  const entries: DtmTopicConfidenceEntry[] = new Array(N);
  let withAny = 0;
  let strongCount = 0;
  for (let i = 0; i < N; i++) {
    const raw = answersPerTopic[i];
    const a = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
    let band: DtmConfidenceBand;
    if (a === 0) band = 'none';
    else if (a < weakMax) band = 'weak';
    else if (a < fairMax) band = 'fair';
    else { band = 'strong'; strongCount++; }
    if (a > 0) withAny++;
    entries[i] = { topicKey: DTM_TOPIC_KEYS[i], answers: a, band };
  }

  const weakest = entries
    .slice()
    .sort((x, y) => x.answers - y.answers)
    .slice(0, weakestN);

  return { entries, coverage: withAny / N, weakest, strongCount };
}
