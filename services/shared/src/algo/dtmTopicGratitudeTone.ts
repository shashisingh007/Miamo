import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type GratitudeToneSignal = 'grateful' | 'appreciative' | 'mixed' | 'entitled' | 'resentful';

export interface GratitudeToneEvent {
  topic: string;
  signal: GratitudeToneSignal;
}

const WEIGHTS: Record<GratitudeToneSignal, number> = {
  grateful: 1,
  appreciative: 0.8,
  mixed: 0.55,
  entitled: 0.25,
  resentful: 0,
};

export type GratitudeToneBand = 'resentful' | 'entitled' | 'mixed' | 'grateful' | 'untested';

export interface GratitudeToneRow {
  topic: string;
  n: number;
  score: number;
  band: GratitudeToneBand;
}

function bandFor(n: number, score: number): GratitudeToneBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'resentful';
  if (score < 0.55) return 'entitled';
  if (score < 0.85) return 'mixed';
  return 'grateful';
}

export function summarizeDtmTopicGratitudeTone(events: GratitudeToneEvent[]): GratitudeToneRow[] {
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
  const out: GratitudeToneRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function resentfulDtmTopics(rows: GratitudeToneRow[]): GratitudeToneRow[] {
  return rows.filter((r) => r.band === 'resentful' || r.band === 'entitled');
}
