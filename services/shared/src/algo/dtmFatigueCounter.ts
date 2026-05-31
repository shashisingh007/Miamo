/**
 * dtmFatigueCounter \u2014 DTM sibling of `fatigue`.
 *
 * Per-(user, topic) decay-weighted counter of *how recently we asked the
 * user a DTM question on this topic*. The next-question learner reads
 * `topicAskPenalty` to avoid hammering the same topic in consecutive
 * sessions even when the information-gain math marginally favours it.
 *
 * Model mirrors `fatigue` but with topic-appropriate defaults:
 *   - Half-life 72h (DTM cadence is days, not hours).
 *   - +1 per question shown.
 *   - Answering (good signal) resets to 0; skipping does NOT reset.
 *   - Penalty is in [0, MAX_PENALTY] (DTM scores are 0..1 so default
 *     MAX_PENALTY=0.20 i.e. 20pp).
 *
 * Pure: caller persists state.
 */
export type DtmFatigueRecord = {
  count: number;
  updatedAtMs: number;
};

export type DtmFatigueOptions = {
  halfLifeMs?: number;
  step?: number;
  maxPenalty?: number;
};

const HALF_LIFE_MS_DEFAULT = 72 * 60 * 60 * 1000; // 3 days
const STEP_DEFAULT = 0.05;
const MAX_PENALTY_DEFAULT = 0.20;

export function decayDtm(rec: DtmFatigueRecord, nowMs: number, opts: DtmFatigueOptions = {}): DtmFatigueRecord {
  const hl = opts.halfLifeMs ?? HALF_LIFE_MS_DEFAULT;
  const dt = Math.max(0, nowMs - rec.updatedAtMs);
  if (dt === 0) return { ...rec };
  const factor = Math.pow(0.5, dt / hl);
  return { count: rec.count * factor, updatedAtMs: nowMs };
}

export function recordTopicAsk(
  rec: DtmFatigueRecord | null,
  nowMs: number,
  opts: DtmFatigueOptions = {},
): DtmFatigueRecord {
  const base = rec ?? { count: 0, updatedAtMs: nowMs };
  const decayed = decayDtm(base, nowMs, opts);
  return { count: decayed.count + 1, updatedAtMs: nowMs };
}

export function resetOnAnswer(nowMs: number): DtmFatigueRecord {
  return { count: 0, updatedAtMs: nowMs };
}

export function topicAskPenalty(
  rec: DtmFatigueRecord | null,
  nowMs: number,
  opts: DtmFatigueOptions = {},
): number {
  if (!rec) return 0;
  const step = opts.step ?? STEP_DEFAULT;
  const maxP = opts.maxPenalty ?? MAX_PENALTY_DEFAULT;
  const d = decayDtm(rec, nowMs, opts);
  return Math.min(maxP, Math.max(0, d.count) * step);
}
