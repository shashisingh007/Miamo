/**
 * Cron expression parser + next-run calculator for 5-field UTC cron.
 *
 *   Fields:  m  h  dom  mon  dow   (space-separated, all required)
 *   Tokens:  `*`, `N`, `A-B`, `A-B/S`, `* /S`, comma-lists like `1,3,5`
 *   Months / days-of-week are numeric only (0–6 for dow, Sun=0=7).
 *
 * Pure: no Date.now() unless explicitly passed via `fromMs`.
 */

export type CronField = 'minute' | 'hour' | 'dom' | 'month' | 'dow';

interface CronSpec {
  minute: ReadonlySet<number>;
  hour: ReadonlySet<number>;
  dom: ReadonlySet<number>;
  month: ReadonlySet<number>;
  dow: ReadonlySet<number>;
  /** true when neither dom nor dow had a constraint (both wildcard) */
  domDowBothWild: boolean;
  /** true when dom had a constraint */
  domConstrained: boolean;
  /** true when dow had a constraint */
  dowConstrained: boolean;
}

const RANGES: Record<CronField, [number, number]> = {
  minute: [0, 59],
  hour: [0, 23],
  dom: [1, 31],
  month: [1, 12],
  dow: [0, 6],
};

function parseField(token: string, field: CronField): { values: Set<number>; wild: boolean } {
  const [lo, hi] = RANGES[field];
  const out = new Set<number>();
  let wild = false;
  for (const part of token.split(',')) {
    const sl = part.split('/');
    if (sl.length > 2) throw new RangeError(`bad step in ${field}: ${part}`);
    const step = sl.length === 2 ? Number(sl[1]) : 1;
    if (!Number.isInteger(step) || step <= 0) {
      throw new RangeError(`bad step in ${field}: ${part}`);
    }
    let start: number;
    let end: number;
    const base = sl[0];
    if (base === '*') {
      wild = true;
      start = lo;
      end = hi;
    } else if (base.includes('-')) {
      const [a, b] = base.split('-');
      start = Number(a);
      end = Number(b);
      if (!Number.isInteger(start) || !Number.isInteger(end)) {
        throw new RangeError(`bad range in ${field}: ${part}`);
      }
    } else {
      start = Number(base);
      end = sl.length === 2 ? hi : start;
      if (!Number.isInteger(start)) {
        throw new RangeError(`bad value in ${field}: ${part}`);
      }
    }
    // dow accepts 7 as Sunday
    if (field === 'dow') {
      if (start === 7) start = 0;
      if (end === 7) end = 0;
    }
    if (start < lo || end > hi || start > end) {
      throw new RangeError(`out-of-range in ${field}: ${part}`);
    }
    for (let v = start; v <= end; v += step) out.add(v);
  }
  if (out.size === 0) throw new RangeError(`empty set in ${field}: ${token}`);
  return { values: out, wild };
}

export function parseCron(expr: string): CronSpec {
  if (typeof expr !== 'string') throw new TypeError('expr must be string');
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new RangeError(`expected 5 fields, got ${parts.length}`);
  }
  const minute = parseField(parts[0], 'minute');
  const hour = parseField(parts[1], 'hour');
  const dom = parseField(parts[2], 'dom');
  const month = parseField(parts[3], 'month');
  const dow = parseField(parts[4], 'dow');
  return {
    minute: minute.values,
    hour: hour.values,
    dom: dom.values,
    month: month.values,
    dow: dow.values,
    domDowBothWild: dom.wild && dow.wild,
    domConstrained: !dom.wild,
    dowConstrained: !dow.wild,
  };
}

const MAX_ITER_MINUTES = 366 * 24 * 60 * 2; // 2-year search ceiling

export function nextCronRun(spec: CronSpec, fromMs: number): number | null {
  if (!Number.isFinite(fromMs)) return null;
  // start from the next whole minute
  const start = Math.floor(fromMs / 60_000) * 60_000 + 60_000;
  let cursor = start;
  for (let i = 0; i < MAX_ITER_MINUTES; i++) {
    const d = new Date(cursor);
    const minute = d.getUTCMinutes();
    const hour = d.getUTCHours();
    const dom = d.getUTCDate();
    const month = d.getUTCMonth() + 1;
    const dow = d.getUTCDay();
    const monthOk = spec.month.has(month);
    const minuteOk = spec.minute.has(minute);
    const hourOk = spec.hour.has(hour);
    let dateOk: boolean;
    if (spec.domDowBothWild) dateOk = true;
    else if (spec.domConstrained && spec.dowConstrained) {
      // cron convention: OR when both are constrained
      dateOk = spec.dom.has(dom) || spec.dow.has(dow);
    } else if (spec.domConstrained) {
      dateOk = spec.dom.has(dom);
    } else {
      dateOk = spec.dow.has(dow);
    }
    if (monthOk && dateOk && hourOk && minuteOk) return cursor;
    cursor += 60_000;
  }
  return null;
}
