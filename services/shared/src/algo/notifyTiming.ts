/**
 * v4 Notifications — peak-hour scheduling.
 *
 * For a recipient uidHash with FeatureSnapshot.peakHours (top-N hours by
 * session.heartbeat density, populated by the peak-hours worker), pick the
 * next allowed delivery hour. Honors quiet hours and a per-user rate-limit.
 *
 * Returns the earliest future Date that:
 *   - falls inside `peakHours` (or any hour if peakHours empty)
 *   - is outside quietHours
 *   - is at least minSpacingSec after lastSent
 */
import { registerAlgo } from './registry';
import { v5FeatureEnabled } from './flags';

export type NotifyInputs = {
  now: Date;
  peakHours: number[] | null;
  quietHours: number[] | null;
  lastSent: Date | null;
  minSpacingSec: number;
  /** Local timezone offset in minutes (e.g. -480 for PST). 0 = UTC. */
  tzOffsetMin: number;
};

/**
 * v5 extension — adds a per-user daily cap and a learned "dismiss ratio"
 * back-off. When v5 picks would exceed the cap or the user has dismissed
 * the last `dismissBackoffN` notifications in a row, push delivery to the
 * next day's first peak hour.
 */
export type NotifyV5Inputs = NotifyInputs & {
  /** Notifications already sent to this user today (rolling 24h). */
  sentToday: number;
  /** Hard cap; defaults to 4 if v5 is on and field omitted. */
  dailyCap?: number;
  /** Most recent consecutive dismisses (notification.dismissed without an
   *  opened in-between). 0..N. */
  consecutiveDismisses?: number;
  /** Threshold for back-off. Defaults to 3. */
  dismissBackoffN?: number;
};

export function nextNotifyAtV4(inp: NotifyInputs): Date {
  const peak = new Set((inp.peakHours && inp.peakHours.length) ? inp.peakHours : Array.from({ length: 24 }, (_, i) => i));
  const quiet = new Set(inp.quietHours || []);
  const earliest = inp.lastSent
    ? new Date(Math.max(inp.now.getTime(), inp.lastSent.getTime() + inp.minSpacingSec * 1000))
    : inp.now;
  // Scan ahead in hour increments up to 48h
  for (let i = 0; i < 48; i++) {
    const t = new Date(earliest.getTime() + i * 3600_000);
    const localHour = ((t.getUTCHours() + Math.floor(inp.tzOffsetMin / 60)) % 24 + 24) % 24;
    if (peak.has(localHour) && !quiet.has(localHour)) return t;
  }
  return earliest; // fall-through; never starve
}

/** v4 entry kept for back-compat with the existing callers. */
export const nextNotifyAt = nextNotifyAtV4;

/**
 * v5 scheduler — same hour-scan as v4 with two added guards:
 *
 *   1. Daily cap. If `sentToday >= dailyCap`, push the next attempt to the
 *      first peak hour of the *next* UTC day.
 *   2. Dismiss back-off. If `consecutiveDismisses >= dismissBackoffN`, also
 *      push to the next day — the user is plainly not engaging right now.
 */
export function nextNotifyAtV5(inp: NotifyV5Inputs): Date {
  const cap = inp.dailyCap ?? 4;
  const backoffN = inp.dismissBackoffN ?? 3;
  const overCap = inp.sentToday >= cap;
  const dismissBackoff = (inp.consecutiveDismisses ?? 0) >= backoffN;
  if (overCap || dismissBackoff) {
    // Schedule for the start of the next UTC day, then let v4 pick the
    // first peak hour from there.
    const nextDay = new Date(inp.now);
    nextDay.setUTCHours(24, 0, 0, 0);
    return nextNotifyAtV4({ ...inp, now: nextDay });
  }
  return nextNotifyAtV4(inp);
}

/** Dispatcher. v5 inputs are a superset; callers that only have v4 fields
 *  should keep calling `nextNotifyAt` (alias of v4). */
export function nextNotifyAtDispatch(inp: NotifyV5Inputs): Date {
  return v5FeatureEnabled('notifyTiming') ? nextNotifyAtV5(inp) : nextNotifyAtV4(inp);
}

registerAlgo({
  name: 'notifyTiming',
  surface: 'notifications',
  usesEvents: ['session.heartbeat', 'session.start', 'session.end',
    'notification.shown', 'notification.opened', 'notification.dismissed', 'notification.snoozed'],
  weights: { peakFit: 1 },
});
