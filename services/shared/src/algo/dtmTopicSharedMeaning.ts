import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type SharedMeaningSignal =
  | 'co-constructed'
  | 'aligned'
  | 'parallel'
  | 'divergent'
  | 'fragmented';

export interface SharedMeaningEvent {
  topic: string;
  signal: SharedMeaningSignal;
}

const WEIGHTS: Record<SharedMeaningSignal, number> = {
  'co-constructed': 1,
  'aligned': 0.8,
  'parallel': 0.55,
  'divergent': 0.25,
  'fragmented': 0,
};

export type SharedMeaningBand =
  | 'fragmented'
  | 'divergent'
  | 'parallel'
  | 'shared'
  | 'untested';

export interface SharedMeaningRow {
  topic: string;
  n: number;
  score: number;
  band: SharedMeaningBand;
}

function bandFor(n: number, score: number): SharedMeaningBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'fragmented';
  if (score < 0.55) return 'divergent';
  if (score < 0.85) return 'parallel';
  return 'shared';
}

export function summarizeDtmTopicSharedMeaning(events: SharedMeaningEvent[]): SharedMeaningRow[] {
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
  const out: SharedMeaningRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function fragmentedDtmTopics(rows: SharedMeaningRow[]): SharedMeaningRow[] {
  return rows.filter((r) => r.band === 'fragmented' || r.band === 'divergent');
}
