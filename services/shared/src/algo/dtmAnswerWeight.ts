/**
 * dtmAnswerWeight \u2014 DTM Phase 4 helper: confidence weighting for a single answer.
 *
 * Not every answer is equally trustworthy. A user who taps the first
 * option in 600ms with two edits is less reliable than one who deliberates
 * for 4 seconds and commits. We compute a confidence in [0.20, 1.00]
 * (never zero \u2014 even sloppy answers carry signal) used to scale the
 * per-topic delta the answer applies to the user's DTM vector.
 *
 * Inputs are intentionally minimal so the worker can pass raw event data.
 * Pure & deterministic.
 */
export type DtmAnswerWeightInputs = {
  /** ms from question shown to commit. */
  latencyMs: number;
  /** number of times the user changed their selection before commit. */
  editCount: number;
  /** true if the user explicitly said "skip" / "not sure". */
  wasSkip?: boolean;
  /** true if the question was at the end of a long session (>15 questions). */
  fatigueRisk?: boolean;
};

const MIN_W = 0.20;
const MAX_W = 1.00;

/** Sweet spot: 1.5\u20136s deliberation. Faster or slower both lose weight. */
function latencyWeight(ms: number): number {
  if (!Number.isFinite(ms) || ms <= 0) return 0.5;
  if (ms < 600)        return 0.40;
  if (ms < 1500)       return 0.75;
  if (ms <= 6000)      return 1.00;
  if (ms <= 15000)     return 0.85;
  if (ms <= 30000)     return 0.60;
  return 0.40;
}

function editPenalty(edits: number): number {
  if (edits <= 0) return 1.00;
  if (edits === 1) return 0.85;
  if (edits === 2) return 0.70;
  return 0.50;
}

export function dtmAnswerWeight(inp: DtmAnswerWeightInputs): number {
  if (inp.wasSkip) return MIN_W;
  let w = latencyWeight(inp.latencyMs) * editPenalty(inp.editCount);
  if (inp.fatigueRisk) w *= 0.80;
  return Math.max(MIN_W, Math.min(MAX_W, w));
}
