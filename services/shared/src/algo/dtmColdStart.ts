/**
 * dtmColdStart — sparse-vector handling for Deep-Compat.
 *
 * Analog of the discover cold-start policy, but for DTM. Treats a user as
 * cold when they have answered fewer than `minTopicsForCompat` topics; in
 * that state the deep-compat score is unreliable and should be either
 * suppressed or blended with a neutral prior.
 *
 * A topic is considered "covered" when its scalar in the 16-dim vector is
 * non-zero (the worker l2-normalises after aggregation, so any answer to a
 * topic produces a non-zero scalar).
 *
 * Pure module: no DB, no clock. Caller decides what to do with the result.
 */
import { DTM_TOPIC_COUNT, DTM_TOPIC_KEYS, type DtmTopicKey } from './dtmTopics';

export type DtmColdStartStage = 'empty' | 'sparse' | 'sufficient' | 'full';

export type DtmColdStartReport = {
  stage: DtmColdStartStage;
  coveredCount: number;
  totalTopics: number;
  coverageRatio: number;
  /** Topics with zero scalar, ordered by canonical index. */
  uncoveredTopics: DtmTopicKey[];
  /** Suggested next topic for the UI to prompt (first uncovered, or null when full). */
  suggestedNextTopic: DtmTopicKey | null;
  /** Blend weight to apply to the raw dtmAffinity score (0..1). 0 = suppress. */
  affinityWeight: number;
};

export type DtmColdStartOpts = {
  /** Below this many covered topics we refuse to score (stage='empty'/'sparse'). Default 4. */
  minTopicsForCompat?: number;
  /** Above this many covered topics we treat as 'full'. Default DTM_TOPIC_COUNT. */
  fullThreshold?: number;
};

export function dtmColdStart(
  vec: Float32Array | number[] | null | undefined,
  opts: DtmColdStartOpts = {},
): DtmColdStartReport {
  const minTopics = opts.minTopicsForCompat ?? 4;
  const fullThreshold = opts.fullThreshold ?? DTM_TOPIC_COUNT;

  if (!vec || vec.length === 0) {
    return {
      stage: 'empty',
      coveredCount: 0,
      totalTopics: DTM_TOPIC_COUNT,
      coverageRatio: 0,
      uncoveredTopics: [...DTM_TOPIC_KEYS],
      suggestedNextTopic: DTM_TOPIC_KEYS[0],
      affinityWeight: 0,
    };
  }

  const n = Math.min(vec.length, DTM_TOPIC_COUNT);
  let covered = 0;
  const uncovered: DtmTopicKey[] = [];
  for (let i = 0; i < DTM_TOPIC_COUNT; i++) {
    const v = i < n ? vec[i] : 0;
    if (v !== 0 && Number.isFinite(v)) covered++;
    else uncovered.push(DTM_TOPIC_KEYS[i]);
  }

  const ratio = covered / DTM_TOPIC_COUNT;
  let stage: DtmColdStartStage;
  if (covered === 0) stage = 'empty';
  else if (covered < minTopics) stage = 'sparse';
  else if (covered >= fullThreshold) stage = 'full';
  else stage = 'sufficient';

  let affinityWeight: number;
  switch (stage) {
    case 'empty':      affinityWeight = 0;    break;
    case 'sparse':     affinityWeight = 0.25; break;
    case 'sufficient': affinityWeight = 0.75; break;
    case 'full':       affinityWeight = 1.0;  break;
  }

  return {
    stage,
    coveredCount: covered,
    totalTopics: DTM_TOPIC_COUNT,
    coverageRatio: ratio,
    uncoveredTopics: uncovered,
    suggestedNextTopic: uncovered[0] ?? null,
    affinityWeight,
  };
}
