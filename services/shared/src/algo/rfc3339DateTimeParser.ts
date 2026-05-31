// RFC 3339 / ISO 8601 date-time parser — strict, no Date.parse fallback.
// Returns epoch milliseconds (UTC) or null.

export interface Rfc3339Parts {
  year: number;
  month: number; // 1..12
  day: number; // 1..31
  hour: number; // 0..23
  minute: number; // 0..59
  second: number; // 0..60 (allow leap-second value 60)
  fractionMs: number; // 0..999
  offsetMinutes: number; // UTC offset
  epochMs: number;
}

const RE = /^(\d{4})-(\d{2})-(\d{2})[Tt ](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|z|[+\-]\d{2}:\d{2})$/;

function daysInMonth(y: number, m: number): number {
  if (m === 2) {
    const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    return leap ? 29 : 28;
  }
  return [1, 3, 5, 7, 8, 10, 12].includes(m) ? 31 : 30;
}

export function parseRfc3339(input: string): Rfc3339Parts | null {
  if (typeof input !== 'string') return null;
  const m = RE.exec(input.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  const second = Number(m[6]);
  const frac = m[7] ?? '';
  const tz = m[8];

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  if (hour > 23) return null;
  if (minute > 59) return null;
  if (second > 60) return null; // allow leap second
  // truncate fractional to ms precision
  const fractionMs = frac ? Number(frac.slice(0, 3).padEnd(3, '0')) : 0;

  let offsetMinutes: number;
  if (tz === 'Z' || tz === 'z') {
    offsetMinutes = 0;
  } else {
    const sign = tz[0] === '-' ? -1 : 1;
    const oh = Number(tz.slice(1, 3));
    const om = Number(tz.slice(4, 6));
    if (oh > 14 || om > 59) return null;
    offsetMinutes = sign * (oh * 60 + om);
  }

  // Compute epoch using Date.UTC (no DST issues). Handle leap second by capping.
  const cappedSecond = Math.min(second, 59);
  const utcMs = Date.UTC(year, month - 1, day, hour, minute, cappedSecond, fractionMs);
  if (Number.isNaN(utcMs)) return null;
  // Subtract offset to get true UTC instant
  const epochMs = utcMs - offsetMinutes * 60 * 1000;

  return { year, month, day, hour, minute, second, fractionMs, offsetMinutes, epochMs };
}

export function isValidRfc3339(input: string): boolean {
  return parseRfc3339(input) !== null;
}

export function formatRfc3339Utc(epochMs: number, opts: { fractional?: boolean } = {}): string {
  if (!Number.isFinite(epochMs)) throw new Error('epochMs must be finite');
  const d = new Date(epochMs);
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const pad3 = (n: number) => String(n).padStart(3, '0');
  const base = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
  const frac = opts.fractional === false ? '' : `.${pad3(d.getUTCMilliseconds())}`;
  return base + frac + 'Z';
}
