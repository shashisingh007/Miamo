import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type NourishmentSignal =
  | 'nourished'
  | 'satisfied'
  | 'adequate'
  | 'hungry'
  | 'starved';

export interface NourishmentEvent {
  topic: string;
  signal: NourishmentSignal;
}

const WEIGHTS: Record<NourishmentSignal, number> = {
  nourished: 1,
  satisfied: 0.8,
  adequate: 0.55,
  hungry: 0.25,
  starved: 0,
};

export type NourishmentBand =
  | 'starved'
  | 'hungry'
  | 'adequate'
  | 'satisfied'
  | 'untested';

export interface NourishmentRow {
  topic: string;
  n: number;
  score: number;
  band: NourishmentBand;
}

function bandFor(n: number, score: number): NourishmentBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'starved';
  if (score < 0.55) return 'hungry';
  if (score < 0.85) return 'adequate';
  return 'satisfied';
}

export function summarizeDtmTopicNourishmentFlow(events: NourishmentEvent[]): NourishmentRow[] {
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
  const out: NourishmentRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function starvedDtmTopics(rows: NourishmentRow[]): NourishmentRow[] {
  return rows.filter((r) => r.band === 'starved' || r.band === 'hungry');
}
