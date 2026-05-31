import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type WonderCadenceSignal = 'awe' | 'wonder' | 'mixed' | 'flat' | 'numb';

export interface WonderCadenceEvent {
  topic: string;
  signal: WonderCadenceSignal;
}

const WEIGHTS: Record<WonderCadenceSignal, number> = {
  awe: 1,
  wonder: 0.8,
  mixed: 0.55,
  flat: 0.25,
  numb: 0,
};

export type WonderCadenceBand = 'numb' | 'flat' | 'mixed' | 'wondrous' | 'untested';

export interface WonderCadenceRow {
  topic: string;
  n: number;
  score: number;
  band: WonderCadenceBand;
}

function bandFor(n: number, score: number): WonderCadenceBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'numb';
  if (score < 0.55) return 'flat';
  if (score < 0.85) return 'mixed';
  return 'wondrous';
}

export function summarizeDtmTopicWonderCadence(events: WonderCadenceEvent[]): WonderCadenceRow[] {
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
  const out: WonderCadenceRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function numbDtmTopics(rows: WonderCadenceRow[]): WonderCadenceRow[] {
  return rows.filter((r) => r.band === 'numb' || r.band === 'flat');
}
