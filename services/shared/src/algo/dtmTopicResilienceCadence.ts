import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type ResilienceCadenceSignal =
  | 'bouncing'
  | 'recovering'
  | 'steady'
  | 'depleted'
  | 'collapsed';

export interface ResilienceCadenceEvent {
  topic: string;
  signal: ResilienceCadenceSignal;
}

const WEIGHTS: Record<ResilienceCadenceSignal, number> = {
  bouncing: 1,
  recovering: 0.8,
  steady: 0.55,
  depleted: 0.25,
  collapsed: 0,
};

export type ResilienceCadenceBand =
  | 'collapsed'
  | 'depleted'
  | 'steady'
  | 'recovering'
  | 'untested';

export interface ResilienceCadenceRow {
  topic: string;
  n: number;
  score: number;
  band: ResilienceCadenceBand;
}

function bandFor(n: number, score: number): ResilienceCadenceBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'collapsed';
  if (score < 0.55) return 'depleted';
  if (score < 0.85) return 'steady';
  return 'recovering';
}

export function summarizeDtmTopicResilienceCadence(events: ResilienceCadenceEvent[]): ResilienceCadenceRow[] {
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
  const out: ResilienceCadenceRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function collapsedDtmTopics(rows: ResilienceCadenceRow[]): ResilienceCadenceRow[] {
  return rows.filter((r) => r.band === 'collapsed' || r.band === 'depleted');
}
