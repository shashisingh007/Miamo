/**
 * dtmNextQuestion \u2014 Phase 16 next-topic / next-question picker (DTM bandit).
 *
 * Picks which DTM topic to ask the user about next. Combines:
 *
 *   1. Coverage need        \u2014 prefer uncovered or under-covered topics.
 *   2. Answerer-archetype   \u2014 explore vs exploit balance from
 *                              `classifyDtmAnswerer` confidence.
 *   3. Drift recovery       \u2014 when `detectDtmDrift` flags a top topic,
 *                              prioritise its neighbours.
 *   4. Epsilon-greedy       \u2014 with probability `explorationRate` pick a
 *                              uniform random uncovered topic; otherwise
 *                              pick the highest-score topic.
 *
 * Pure: caller supplies a deterministic random function for reproducibility
 * in tests. Output is `{ topic, score, exploration }`.
 */
import {
  DTM_TOPIC_COUNT,
  DTM_TOPIC_KEYS,
  type DtmTopicKey,
} from './dtmTopics';

export type DtmNextQuestionInputs = {
  /** Current per-topic coverage strength in [0, 1] (e.g. normalised answer count). */
  coverage: Record<DtmTopicKey, number> | Float32Array | number[];
  /** Optional topic priority hints (e.g. drift target). Higher = pick sooner. */
  priorityHints?: Partial<Record<DtmTopicKey, number>>;
  /** Bandit exploration rate in [0, 1]. */
  explorationRate?: number;
  /** Deterministic [0, 1) random. Defaults to Math.random. */
  rng?: () => number;
};

export type DtmNextQuestionResult = {
  topic: DtmTopicKey;
  score: number;
  exploration: boolean;
};

function coverageOf(
  cov: DtmNextQuestionInputs['coverage'],
  index: number,
  key: DtmTopicKey,
): number {
  if (cov instanceof Float32Array || Array.isArray(cov)) {
    const v = index < cov.length ? (cov as ArrayLike<number>)[index] : 0;
    return Number.isFinite(v) ? v : 0;
  }
  const v = (cov as Record<DtmTopicKey, number>)[key];
  return Number.isFinite(v) ? v : 0;
}

export function pickNextDtmTopic(inp: DtmNextQuestionInputs): DtmNextQuestionResult {
  const rng = inp.rng ?? Math.random;
  const explorationRate = Math.max(0, Math.min(1, inp.explorationRate ?? 0.10));
  const hints = inp.priorityHints ?? {};

  const uncovered: { topic: DtmTopicKey; idx: number; cov: number }[] = [];
  const scored: { topic: DtmTopicKey; score: number }[] = [];

  for (let i = 0; i < DTM_TOPIC_COUNT; i++) {
    const topic = DTM_TOPIC_KEYS[i];
    const cov = Math.max(0, Math.min(1, coverageOf(inp.coverage, i, topic)));
    const hint = Math.max(0, hints[topic] ?? 0);
    // Score \u2014 (1 - cov) is the "need", hint is a learned add-on.
    const score = (1 - cov) + 0.5 * hint;
    scored.push({ topic, score });
    if (cov < 1) uncovered.push({ topic, idx: i, cov });
  }

  // Epsilon-greedy: explore by sampling uniformly from uncovered topics.
  if (uncovered.length > 0 && rng() < explorationRate) {
    const pick = uncovered[Math.floor(rng() * uncovered.length) % uncovered.length];
    return { topic: pick.topic, score: 1 - pick.cov, exploration: true };
  }

  // Exploit: highest score. Ties broken by canonical index for determinism.
  let best = scored[0];
  for (let i = 1; i < scored.length; i++) {
    if (scored[i].score > best.score) best = scored[i];
  }
  return { topic: best.topic, score: best.score, exploration: false };
}
