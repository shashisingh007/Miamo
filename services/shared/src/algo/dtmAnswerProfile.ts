/**
 * dtmAnswerProfile \u2014 Phase 4 analog of `moveProfile` for DTM.
 *
 * Classifies a user's DTM answering style from per-question telemetry.
 * Output informs the next-question picker and the chip text generator
 * ("Priya is a decisive answerer; show fewer scale questions").
 *
 * Archetypes:
 *   - decisive       fast median answer time, low revisit rate
 *   - exploratory    medium time, high revisit rate, high topic breadth
 *   - skeptical      long time, low completion rate
 *   - completionist  many sessions, high completion rate, medium time
 *
 * Pure function. Deterministic. Uses only counts and milliseconds (no PII).
 */

export type DtmAnswererArchetype = 'decisive' | 'exploratory' | 'skeptical' | 'completionist';

export type DtmAnswerStats = {
  /** Total questions answered (any topic). */
  totalAnswered: number;
  /** Total questions started (viewed) \u2014 answered + abandoned. */
  totalStarted: number;
  /** Median time-to-answer per question, milliseconds. */
  p50AnswerMs: number;
  /** Share of questions the user changed after first answering (0..1). */
  revisitRate: number;
  /** Distinct topics touched (0..16). */
  topicsCovered: number;
  /** Number of distinct DTM sessions. */
  sessionCount: number;
};

export type DtmAnswerClassification = {
  archetype: DtmAnswererArchetype;
  probs: Record<DtmAnswererArchetype, number>;
  confidence: number;
};

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function softScores(s: DtmAnswerStats): Record<DtmAnswererArchetype, number> {
  const completionRate = s.totalStarted > 0 ? s.totalAnswered / s.totalStarted : 0;
  const breadth = clamp01(s.topicsCovered / 16);
  // Time bands: <8s fast, 8\u201320s medium, >20s slow.
  const fast = clamp01((20_000 - s.p50AnswerMs) / 12_000);
  const slow = clamp01((s.p50AnswerMs - 8_000) / 22_000);
  const medium = clamp01(1 - Math.abs((s.p50AnswerMs - 14_000) / 14_000));

  const decisive      = fast * clamp01(1 - s.revisitRate) * clamp01(completionRate);
  const exploratory   = medium * clamp01(s.revisitRate * 2) * breadth;
  const skeptical     = slow * clamp01(1 - completionRate);
  const completionist = clamp01(s.sessionCount / 5) * clamp01(completionRate) * medium;

  const sum = decisive + exploratory + skeptical + completionist;
  if (sum <= 0) {
    return { decisive: 0.25, exploratory: 0.25, skeptical: 0.25, completionist: 0.25 };
  }
  return {
    decisive:      decisive      / sum,
    exploratory:   exploratory   / sum,
    skeptical:     skeptical     / sum,
    completionist: completionist / sum,
  };
}

function confidence(
  probs: Record<DtmAnswererArchetype, number>,
  totalAnswered: number,
): number {
  const top = Math.max(probs.decisive, probs.exploratory, probs.skeptical, probs.completionist);
  const sample = clamp01(totalAnswered / 40);
  const peakedness = clamp01((top - 0.25) / 0.75);
  return clamp01(0.5 * sample + 0.5 * peakedness);
}

export function classifyDtmAnswerer(stats: DtmAnswerStats): DtmAnswerClassification {
  const probs = softScores(stats);
  let best: DtmAnswererArchetype = 'decisive';
  let bestP = -1;
  for (const k of Object.keys(probs) as DtmAnswererArchetype[]) {
    if (probs[k] > bestP) { bestP = probs[k]; best = k; }
  }
  return { archetype: best, probs, confidence: confidence(probs, stats.totalAnswered) };
}
