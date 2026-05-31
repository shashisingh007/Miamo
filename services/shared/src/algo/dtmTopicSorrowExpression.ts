import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type SorrowSignal = 'desolate' | 'sorrowful' | 'mixed' | 'wistful' | 'composed';

export interface SorrowEvent {
  topic: string;
  signal: SorrowSignal;
}

const WEIGHTS: Record<SorrowSignal, number> = {
  desolate: 1,
  sorrowful: 0.8,
  mixed: 0.55,
  wistful: 0.25,
  composed: 0,
};

export type SorrowBand = 'composed' | 'wistful' | 'mixed' | 'sorrowful' | 'untested';

export interface SorrowRow {
  topic: string;
  n: number;
  score: number;
  band: SorrowBand;
}

function bandFor(n: number, score: number): SorrowBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'composed';
  if (score < 0.55) return 'wistful';
  if (score < 0.85) return 'mixed';
  return 'sorrowful';
}

export function summarizeDtmTopicSorrowExpression(events: SorrowEvent[]): SorrowRow[] {
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
  const out: SorrowRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function sorrowfulDtmTopics(rows: SorrowRow[]): SorrowRow[] {
  return rows.filter((r) => r.band === 'sorrowful' || r.band === 'mixed');
}
