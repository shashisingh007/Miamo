/**
 * UTC offset parser for ISO-8601-ish suffixes and a small set of common
 * IANA-style offsets. Returns offset in minutes east of UTC.
 *
 *   `Z`                  → 0
 *   `+05:30`, `-08:00`   → 330, -480
 *   `+0530`, `-0800`     → 330, -480
 *   `+05`, `-08`         → 300, -480
 *   `UTC+5`, `GMT-08`    → 300, -480
 *
 * Returns null for anything else (including bad ranges).
 */

const OFFSET_FORMS = [
  // ±HH:MM
  /^([+-])(\d{2}):(\d{2})$/,
  // ±HHMM
  /^([+-])(\d{2})(\d{2})$/,
  // ±HH
  /^([+-])(\d{2})$/,
];

function parseSigned(s: string): number | null {
  for (const re of OFFSET_FORMS) {
    const m = re.exec(s);
    if (!m) continue;
    const sign = m[1] === '-' ? -1 : 1;
    const hh = Number(m[2]);
    const mm = m[3] !== undefined ? Number(m[3]) : 0;
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    if (hh > 14 || mm > 59) return null;
    return sign * (hh * 60 + mm);
  }
  return null;
}

export function parseUtcOffsetMinutes(input: string): number | null {
  if (typeof input !== 'string') return null;
  const s = input.trim();
  if (s === '') return null;
  if (s === 'Z' || s === 'z') return 0;
  if (s === 'UTC' || s === 'GMT') return 0;
  const lower = s.toUpperCase();
  if (lower.startsWith('UTC') || lower.startsWith('GMT')) {
    return parseSigned(lower.slice(3));
  }
  return parseSigned(s);
}

export function formatUtcOffsetMinutes(
  minutes: number,
  opts: { includeColon?: boolean } = {}
): string | null {
  if (!Number.isFinite(minutes)) return null;
  if (minutes < -14 * 60 || minutes > 14 * 60) return null;
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(Math.trunc(minutes));
  const hh = Math.floor(abs / 60);
  const mm = abs % 60;
  const sep = opts.includeColon === false ? '' : ':';
  const hhs = String(hh).padStart(2, '0');
  const mms = String(mm).padStart(2, '0');
  return `${sign}${hhs}${sep}${mms}`;
}

export function isUtcOffsetEquivalent(a: string, b: string): boolean {
  const ma = parseUtcOffsetMinutes(a);
  const mb = parseUtcOffsetMinutes(b);
  if (ma === null || mb === null) return false;
  return ma === mb;
}
