import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type LongingSignal = 'aching' | 'yearning' | 'mixed' | 'wistful' | 'detached';

export interface LongingEvent {
  topic: string;
  signal: LongingSignal;
}

const WEIGHTS: Record<LongingSignal, number> = {
  aching: 1,
  yearning: 0.8,
  mixed: 0.55,
  wistful: 0.25,
  detached: 0,
};

export type LongingBand = 'detached' | 'wistful' | 'mixed' | 'yearning' | 'untested';

export interface LongingRow {
  topic: string;
  n: number;
  score: number;
  band: LongingBand;
}

function bandFor(n: number, score: number): LongingBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'detached';
  if (score < 0.55) return 'wistful';
  if (score < 0.85) return 'mixed';
  return 'yearning';
}

export function summarizeDtmTopicLongingExpression(events: LongingEvent[]): LongingRow[] {
  const acc = new Map<string, { sum: number; n: number }>();
  for (const t of DTM_TOPIC_KEYS) acc.set(t, { sum: 0, n: 0 });
  for (const e of events) {
    if (!INDEX.has(e.topic)) continue;
    const w = WEIGHTS[e.signal];
    if (w === undefined) continue;
    const c = acc.get(e.topic)!;
    c.sum += w;
    c.n += 1;
  }
  const out: LongingRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function detachedDtmTopics(rows: LongingRow[]): LongingRow[] {
  return rows.filter((r) => r.band === 'detached' || r.band === 'wistful');
}
