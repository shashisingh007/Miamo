import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type SacredCadenceSignal =
  | 'devoted'
  | 'honored'
  | 'noted'
  | 'forgotten'
  | 'profaned';

export interface SacredCadenceEvent {
  topic: string;
  signal: SacredCadenceSignal;
}

const WEIGHTS: Record<SacredCadenceSignal, number> = {
  devoted: 1,
  honored: 0.8,
  noted: 0.55,
  forgotten: 0.25,
  profaned: 0,
};

export type SacredCadenceBand =
  | 'profaned'
  | 'forgotten'
  | 'noted'
  | 'sacred'
  | 'untested';

export interface SacredCadenceRow {
  topic: string;
  n: number;
  score: number;
  band: SacredCadenceBand;
}

function bandFor(n: number, score: number): SacredCadenceBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'profaned';
  if (score < 0.55) return 'forgotten';
  if (score < 0.85) return 'noted';
  return 'sacred';
}

export function summarizeDtmTopicSacredCadence(events: SacredCadenceEvent[]): SacredCadenceRow[] {
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
  const out: SacredCadenceRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function profanedDtmTopics(rows: SacredCadenceRow[]): SacredCadenceRow[] {
  return rows.filter((r) => r.band === 'profaned' || r.band === 'forgotten');
}
