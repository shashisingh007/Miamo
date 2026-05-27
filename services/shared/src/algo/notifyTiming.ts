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

export type NotifyInputs = {
  now: Date;
  peakHours: number[] | null;
  quietHours: number[] | null;
  lastSent: Date | null;
  minSpacingSec: number;
  /** Local timezone offset in minutes (e.g. -480 for PST). 0 = UTC. */
  tzOffsetMin: number;
};

export function nextNotifyAt(inp: NotifyInputs): Date {
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

registerAlgo({
  name: 'notifyTiming',
  surface: 'notifications',
  usesEvents: ['session.heartbeat', 'session.start', 'session.end',
    'notification.shown', 'notification.opened', 'notification.dismissed', 'notification.snoozed'],
  weights: { peakFit: 1 },
});
