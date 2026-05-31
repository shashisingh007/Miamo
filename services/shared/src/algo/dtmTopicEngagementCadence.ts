import { DTM_TOPIC_KEYS, type DtmTopicKey } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export interface DtmTopicTouchEvent {
  topic: string;
  tsMs: number;
}

export type DtmCadenceBand =
  | 'dormant'
  | 'occasional'
  | 'regular'
  | 'frequent'
  | 'saturated';

export interface DtmTopicEngagementCadenceRow {
  topic: DtmTopicKey;
  touches: number;
  /** touches per day inside the inclusive window */
  ratePerDay: number;
  /** ms since the most recent touch (Infinity when none in window) */
  ageMs: number;
  band: DtmCadenceBand;
}

export interface DtmCadenceOptions {
  /** trailing window in ms (default 28 days) */
  windowMs?: number;
}

const DAY = 86_400_000;

function bandOf(rate: number, ageMs: number, windowDays: number): DtmCadenceBand {
  if (rate <= 0) return 'dormant';
  // staleness override: a single touch right at the start of the window
  // shouldn't promote past "occasional" if there's nothing recent
  if (ageMs > (windowDays / 2) * DAY) return 'occasional';
  if (rate < 0.25) return 'occasional';
  if (rate < 1) return 'regular';
  if (rate < 3) return 'frequent';
  return 'saturated';
}

export function summarizeDtmTopicEngagementCadence(
  events: readonly DtmTopicTouchEvent[],
  nowMs: number,
  opts: DtmCadenceOptions = {}
): DtmTopicEngagementCadenceRow[] {
  if (!Number.isFinite(nowMs)) return [];
  const windowMs = opts.windowMs ?? 28 * DAY;
  if (!Number.isFinite(windowMs) || windowMs <= 0) return [];
  const windowDays = windowMs / DAY;
  type Bucket = { touches: number; latestMs: number };
  const buckets = new Map<string, Bucket>();
  for (const ev of events) {
    if (!ev || !INDEX.has(ev.topic)) continue;
    if (typeof ev.tsMs !== 'number' || !Number.isFinite(ev.tsMs)) continue;
    const age = nowMs - ev.tsMs;
    if (age < 0 || age > windowMs) continue;
    let b = buckets.get(ev.topic);
    if (!b) {
      b = { touches: 0, latestMs: -Infinity };
      buckets.set(ev.topic, b);
    }
    b.touches++;
    if (ev.tsMs > b.latestMs) b.latestMs = ev.tsMs;
  }
  const rows: DtmTopicEngagementCadenceRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const b = buckets.get(topic);
    if (!b || b.touches === 0) continue;
    const ratePerDay = b.touches / windowDays;
    const ageMs = nowMs - b.latestMs;
    rows.push({
      topic,
      touches: b.touches,
      ratePerDay,
      ageMs,
      band: bandOf(ratePerDay, ageMs, windowDays),
    });
  }
  return rows;
}

export function staleDtmTopics(
  rows: readonly DtmTopicEngagementCadenceRow[]
): DtmTopicKey[] {
  return rows
    .filter((r) => r.band === 'dormant' || r.band === 'occasional')
    .map((r) => r.topic);
}
