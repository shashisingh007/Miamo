import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type FreedomSignal = 'free' | 'open' | 'mixed' | 'constrained' | 'trapped';

export interface FreedomEvent {
  topic: string;
  signal: FreedomSignal;
}

const WEIGHTS: Record<FreedomSignal, number> = {
  free: 1,
  open: 0.8,
  mixed: 0.55,
  constrained: 0.25,
  trapped: 0,
};

export type FreedomBand = 'trapped' | 'constrained' | 'mixed' | 'open' | 'untested';

export interface FreedomRow {
  topic: string;
  n: number;
  score: number;
  band: FreedomBand;
}

function bandFor(n: number, score: number): FreedomBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'trapped';
  if (score < 0.55) return 'constrained';
  if (score < 0.85) return 'mixed';
  return 'open';
}

export function summarizeDtmTopicFreedomQuality(events: FreedomEvent[]): FreedomRow[] {
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
  const out: FreedomRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function trappedDtmTopics(rows: FreedomRow[]): FreedomRow[] {
  return rows.filter((r) => r.band === 'trapped' || r.band === 'constrained');
}
