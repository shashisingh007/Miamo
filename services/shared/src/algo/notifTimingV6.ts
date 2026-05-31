/**
 * v6 notif-timing curve — Phase 17 + Phase 5 quiet-hours guard.
 *
 * Pure scorer: given a user's chronotype + peak hours + last-active-at +
 * a proposed send time, return a probability that the user opens the push
 * within 30 minutes. Used by the notification dispatcher to pick the best
 * minute inside a 1-hour candidate window, and to suppress sends that fall
 * inside the user's quiet-hours band.
 *
 * Score components (each in 0..1, multiplied):
 *
 *   chronoFit      1.0 if hour lands in user's peakHours
 *                  0.6 if within ±2h of any peak
 *                  0.3 otherwise
 *
 *   recencyFit     exp-decay over "minutes since last active":
 *                    0..15 min   1.00  (in-app; don't double-up — see quietRecent)
 *                    15..60 min  0.80
 *                    1..4 h      0.95  (sweet spot)
 *                    4..24 h     0.70
 *                    24..72 h    0.40
 *                    >72 h       0.20
 *
 *   quietHourFit   0.0 inside [23:00, 07:00) local (hard quiet)
 *                  1.0 otherwise
 *
 *   capFit         1.0 if user has received <2 notifs in last 4h
 *                  0.5 if 2
 *                  0.0 if >=3 (over-cap)
 */

export type NotifTimingInputs = {
  /** local hour-of-day (0..23) of the proposed send. */
  sendHourLocal: number;
  /** chronotype: 'morning' | 'evening' | 'mixed' | null. */
  chronotype: string | null;
  /** array of peak hours (0..23); may be empty. */
  peakHours: number[] | null;
  /** minutes since last in-app activity; null if unknown. */
  minutesSinceActive: number | null;
  /** number of notifs already sent in the last 4 hours. */
  notifsLast4h: number;
  /** quiet-hours override per-user; defaults to [23, 7). */
  quietStartHour?: number;
  quietEndHour?: number;
};

export type NotifTimingScore = {
  /** 0..1 probability proxy. */
  score: number;
  parts: {
    chronoFit: number;
    recencyFit: number;
    quietHourFit: number;
    capFit: number;
  };
};

export function notifTimingScore(inp: NotifTimingInputs): NotifTimingScore {
  const quietStart = inp.quietStartHour ?? 23;
  const quietEnd   = inp.quietEndHour ?? 7;

  const chronoFit = chronoFitFor(inp.sendHourLocal, inp.chronotype, inp.peakHours);
  const recencyFit = recencyFitFor(inp.minutesSinceActive);
  const quietHourFit = inQuietHours(inp.sendHourLocal, quietStart, quietEnd) ? 0 : 1;
  const capFit = capFitFor(inp.notifsLast4h);

  return {
    score: chronoFit * recencyFit * quietHourFit * capFit,
    parts: { chronoFit, recencyFit, quietHourFit, capFit },
  };
}

export function inQuietHours(hour: number, start: number, end: number): boolean {
  // Quiet band may wrap midnight (e.g. 23..7).
  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

function chronoFitFor(hour: number, chronotype: string | null, peaks: number[] | null): number {
  if (peaks && peaks.length > 0) {
    if (peaks.includes(hour)) return 1.0;
    if (peaks.some((p) => Math.abs(p - hour) <= 2)) return 0.6;
    return 0.3;
  }
  // Fall back to chronotype defaults.
  if (chronotype === 'morning') {
    if (hour >= 7 && hour <= 10)   return 1.0;
    if (hour >= 6 && hour <= 12)   return 0.6;
    return 0.3;
  }
  if (chronotype === 'evening') {
    if (hour >= 20 && hour <= 23)  return 1.0;
    if (hour >= 18 && hour <= 23)  return 0.6;
    return 0.3;
  }
  // 'mixed' or null: flat midday emphasis.
  if (hour >= 12 && hour <= 21)    return 0.7;
  return 0.4;
}

function recencyFitFor(min: number | null): number {
  if (min == null || min < 0) return 0.5;
  if (min <= 15)   return 1.00;
  if (min <= 60)   return 0.80;
  if (min <= 240)  return 0.95;
  if (min <= 1440) return 0.70;
  if (min <= 4320) return 0.40;
  return 0.20;
}

function capFitFor(n: number): number {
  if (n < 2)  return 1.0;
  if (n === 2) return 0.5;
  return 0;
}

/** Helper: given a candidate window of hours, pick the minute with highest
 *  expected score. Returns null if no minute scores above `threshold`. */
export function pickBestSendHour(
  candidateHours: number[],
  baseInputs: Omit<NotifTimingInputs, 'sendHourLocal'>,
  threshold = 0.25,
): { hour: number; score: number } | null {
  let best: { hour: number; score: number } | null = null;
  for (const h of candidateHours) {
    const s = notifTimingScore({ ...baseInputs, sendHourLocal: h }).score;
    if (s >= threshold && (!best || s > best.score)) best = { hour: h, score: s };
  }
  return best;
}
