import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type GratitudeCycleSignal = 'profound' | 'grateful' | 'mixed' | 'indifferent' | 'resentful';

export interface GratitudeCycleEvent {
  topic: string;
  signal: GratitudeCycleSignal;
}

const WEIGHTS: Record<GratitudeCycleSignal, number> = {
  profound: 1,
  grateful: 0.8,
  mixed: 0.55,
  indifferent: 0.25,
  resentful: 0,
};

export type GratitudeCycleBand = 'resentful' | 'indifferent' | 'mixed' | 'grateful' | 'untested';

export interface GratitudeCycleRow {
  topic: string;
  n: number;
  score: number;
  band: GratitudeCycleBand;
}

function bandFor(n: number, score: number): GratitudeCycleBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'resentful';
  if (score < 0.55) return 'indifferent';
  if (score < 0.85) return 'mixed';
  return 'grateful';
}

export function summarizeDtmTopicGratitudeCycle(events: GratitudeCycleEvent[]): GratitudeCycleRow[] {
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
  const out: GratitudeCycleRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function resentfulDtmTopics(rows: GratitudeCycleRow[]): GratitudeCycleRow[] {
  return rows.filter((r) => r.band === 'resentful' || r.band === 'indifferent');
}
