/**
 * notifQuietHours \u2014 Phase 17 quiet-hours guard.
 *
 * Given a planned send time and the user's quiet-hours config (in their
 * local timezone), either:
 *   - return the planned time unchanged (outside quiet window), or
 *   - shift to the first minute *after* the window ends (inside).
 *
 * Quiet window may span midnight (e.g. 22:00\u201307:00) \u2014 we handle both
 * shapes. Timezone is supplied as IANA name and resolved via Intl.
 * Pure & deterministic.
 */
export type QuietHoursConfig = {
  /** "HH:MM" 24h, user-local. */
  startLocal: string;
  /** "HH:MM" 24h, user-local. Exclusive. */
  endLocal: string;
  /** IANA timezone, e.g. "America/Los_Angeles". */
  timezone: string;
};

function parseHHMM(s: string): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { h, m: min };
}

/** Get the user's local wall clock {h, m} for a given UTC instant. */
function localHm(atMs: number, tz: string): { h: number; m: number } {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const parts = fmt.formatToParts(new Date(atMs));
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return { h, m };
}

function inWindow(now: number, start: number, end: number): boolean {
  if (start === end) return false;
  if (start < end) return now >= start && now < end;
  // spans midnight (e.g. 22:00 \u2192 07:00)
  return now >= start || now < end;
}

export function isQuietAt(atMs: number, cfg: QuietHoursConfig): boolean {
  const s = parseHHMM(cfg.startLocal);
  const e = parseHHMM(cfg.endLocal);
  if (!s || !e) return false;
  const now = localHm(atMs, cfg.timezone);
  const sMin = s.h * 60 + s.m;
  const eMin = e.h * 60 + e.m;
  const nMin = now.h * 60 + now.m;
  return inWindow(nMin, sMin, eMin);
}

/** Return a send time that respects the user's quiet hours.
 *  If `atMs` falls inside the window, advance to the first minute >= end. */
export function nextAllowedSend(atMs: number, cfg: QuietHoursConfig): number {
  if (!isQuietAt(atMs, cfg)) return atMs;
  const e = parseHHMM(cfg.endLocal);
  if (!e) return atMs;
  // Advance minute-by-minute until we leave the window. Bounded by 24h.
  let t = atMs;
  const MAX_STEPS = 24 * 60;
  for (let i = 0; i < MAX_STEPS; i++) {
    t += 60_000;
    if (!isQuietAt(t, cfg)) return t;
  }
  return atMs + 24 * 60 * 60 * 1000;
}
