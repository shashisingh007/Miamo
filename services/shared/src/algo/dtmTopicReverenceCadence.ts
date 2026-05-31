import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type ReverenceCadenceSignal =
  | 'sacred'
  | 'reverent'
  | 'respectful'
  | 'casual'
  | 'profane';

export interface ReverenceCadenceEvent {
  topic: string;
  signal: ReverenceCadenceSignal;
}

const WEIGHTS: Record<ReverenceCadenceSignal, number> = {
  sacred: 1,
  reverent: 0.8,
  respectful: 0.55,
  casual: 0.25,
  profane: 0,
};

export type ReverenceCadenceBand =
  | 'profane'
  | 'casual'
  | 'respectful'
  | 'reverent'
  | 'untested';

export interface ReverenceCadenceRow {
  topic: string;
  n: number;
  score: number;
  band: ReverenceCadenceBand;
}

function bandFor(n: number, score: number): ReverenceCadenceBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'profane';
  if (score < 0.55) return 'casual';
  if (score < 0.85) return 'respectful';
  return 'reverent';
}

export function summarizeDtmTopicReverenceCadence(events: ReverenceCadenceEvent[]): ReverenceCadenceRow[] {
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
  const out: ReverenceCadenceRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function profaneDtmTopics(rows: ReverenceCadenceRow[]): ReverenceCadenceRow[] {
  return rows.filter((r) => r.band === 'profane' || r.band === 'casual');
}
