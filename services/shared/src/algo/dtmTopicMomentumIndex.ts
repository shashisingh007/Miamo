import { DTM_TOPIC_KEYS, type DtmTopicKey } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export interface DtmTopicTimedSample {
  topic: string;
  value: number;
  tsMs: number;
}

export type DtmMomentumDirection = 'accelerating' | 'steady' | 'decelerating' | 'unknown';

export interface DtmTopicMomentumRow {
  topic: DtmTopicKey;
  shortMean: number;
  longMean: number;
  momentum: number; // short - long, clamped [-2, 2]
  direction: DtmMomentumDirection;
}

export interface DtmTopicMomentumOptions {
  /** sliding short window in ms (default 7d) */
  shortWindowMs?: number;
  /** sliding long window in ms (default 30d) */
  longWindowMs?: number;
  /** absolute |momentum| threshold for direction (default 0.1) */
  threshold?: number;
}

const DAY = 86_400_000;
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

export function computeDtmTopicMomentum(
  samples: readonly DtmTopicTimedSample[],
  nowMs: number,
  opts: DtmTopicMomentumOptions = {}
): DtmTopicMomentumRow[] {
  const shortW = opts.shortWindowMs ?? 7 * DAY;
  const longW = opts.longWindowMs ?? 30 * DAY;
  const thr = opts.threshold ?? 0.1;
  if (!Number.isFinite(nowMs)) return [];

  const shortBuckets = new Map<string, number[]>();
  const longBuckets = new Map<string, number[]>();
  for (const s of samples) {
    if (!s || !INDEX.has(s.topic)) continue;
    if (typeof s.value !== 'number' || !Number.isFinite(s.value)) continue;
    if (typeof s.tsMs !== 'number' || !Number.isFinite(s.tsMs)) continue;
    const age = nowMs - s.tsMs;
    if (age < 0) continue;
    const v = clamp(s.value, -1, 1);
    if (age <= longW) {
      let lb = longBuckets.get(s.topic);
      if (!lb) { lb = []; longBuckets.set(s.topic, lb); }
      lb.push(v);
    }
    if (age <= shortW) {
      let sb = shortBuckets.get(s.topic);
      if (!sb) { sb = []; shortBuckets.set(s.topic, sb); }
      sb.push(v);
    }
  }

  const rows: DtmTopicMomentumRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const sArr = shortBuckets.get(topic);
    const lArr = longBuckets.get(topic);
    if (!lArr || lArr.length === 0) continue;
    const longMean = lArr.reduce((a, b) => a + b, 0) / lArr.length;
    if (!sArr || sArr.length === 0) {
      rows.push({ topic, shortMean: 0, longMean, momentum: 0, direction: 'unknown' });
      continue;
    }
    const shortMean = sArr.reduce((a, b) => a + b, 0) / sArr.length;
    const momentum = clamp(shortMean - longMean, -2, 2);
    let direction: DtmMomentumDirection;
    if (momentum > thr) direction = 'accelerating';
    else if (momentum < -thr) direction = 'decelerating';
    else direction = 'steady';
    rows.push({ topic, shortMean, longMean, momentum, direction });
  }
  return rows;
}

export function topDtmMomentumTopics(
  rows: readonly DtmTopicMomentumRow[],
  k: number
): DtmTopicMomentumRow[] {
  if (!Number.isFinite(k) || k <= 0) return [];
  return [...rows]
    .sort((a, b) => Math.abs(b.momentum) - Math.abs(a.momentum))
    .slice(0, Math.floor(k));
}
