/**
 * dtmNextSession \u2014 DTM sibling of `notifTimingV6`.
 *
 * Decides when to next ask the user a DTM question. Pure policy:
 *   - If coverage < 4 topics                 \u2192 ask now (onboarding).
 *   - Else if drift score > 0.30             \u2192 ask within 6h (vector stale).
 *   - Else if last-ask was > 7d ago          \u2192 ask within 24h (cadence).
 *   - Else                                   \u2192 defer to default 14d cadence.
 *
 * Returns a target timestamp in ms. Pure, no side effects, no IO.
 */
export type DtmNextSessionInputs = {
  coveredCount: number;        // 0..16
  driftScore: number;          // 0..1, from dtmDrift
  lastAskedAtMs: number | null;
  nowMs: number;
};

export type DtmNextSessionDecision = {
  reason: 'onboarding' | 'drift' | 'cadence' | 'cooldown';
  targetAtMs: number;
  /** Hours from now until the next ask should fire. */
  delayHours: number;
};

const MIN_COVERED = 4;
const DRIFT_THRESHOLD = 0.30;
const COOLDOWN_DAYS = 14;
const STALE_DAYS = 7;
const H = 3_600_000;
const D = 24 * H;

export function decideDtmNextSession(inp: DtmNextSessionInputs): DtmNextSessionDecision {
  const { coveredCount, driftScore, lastAskedAtMs, nowMs } = inp;

  if (coveredCount < MIN_COVERED) {
    return { reason: 'onboarding', targetAtMs: nowMs, delayHours: 0 };
  }
  if (driftScore > DRIFT_THRESHOLD) {
    const target = nowMs + 6 * H;
    return { reason: 'drift', targetAtMs: target, delayHours: 6 };
  }
  const ageMs = lastAskedAtMs == null ? Infinity : Math.max(0, nowMs - lastAskedAtMs);
  if (ageMs > STALE_DAYS * D) {
    const target = nowMs + 24 * H;
    return { reason: 'cadence', targetAtMs: target, delayHours: 24 };
  }
  const target = (lastAskedAtMs ?? nowMs) + COOLDOWN_DAYS * D;
  const delayHours = Math.max(0, (target - nowMs) / H);
  return { reason: 'cooldown', targetAtMs: target, delayHours };
}
