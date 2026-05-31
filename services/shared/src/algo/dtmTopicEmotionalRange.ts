import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type EmotionalRangeSignal =
  | 'full-spectrum'
  | 'expressive'
  | 'measured'
  | 'guarded'
  | 'flat';

export interface EmotionalRangeEvent {
  topic: string;
  signal: EmotionalRangeSignal;
}

const WEIGHTS: Record<EmotionalRangeSignal, number> = {
  'full-spectrum': 1,
  'expressive': 0.8,
  'measured': 0.55,
  'guarded': 0.25,
  'flat': 0,
};

export type EmotionalRangeBand =
  | 'flat'
  | 'guarded'
  | 'expressive'
  | 'full-spectrum'
  | 'untested';

export interface EmotionalRangeRow {
  topic: string;
  n: number;
  score: number;
  band: EmotionalRangeBand;
}

function bandFor(n: number, score: number): EmotionalRangeBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'flat';
  if (score < 0.55) return 'guarded';
  if (score < 0.85) return 'expressive';
  return 'full-spectrum';
}

export function summarizeDtmTopicEmotionalRange(
  events: EmotionalRangeEvent[],
): EmotionalRangeRow[] {
  const acc = new Map<string, { sum: number; n: number }>();
  for (const t of DTM_TOPIC_KEYS) acc.set(t, { sum: 0, n: 0 });
  for (const e of events) {
    if (!INDEX.has(e.topic)) continue;
    const w = WEIGHTS[e.signal];
    if (w === undefined) continue;
    const cell = acc.get(e.topic)!;
    cell.sum += w;
    cell.n += 1;
  }
  const out: EmotionalRangeRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function flatDtmTopics(rows: EmotionalRangeRow[]): EmotionalRangeRow[] {
  return rows.filter((r) => r.band === 'flat');
}
