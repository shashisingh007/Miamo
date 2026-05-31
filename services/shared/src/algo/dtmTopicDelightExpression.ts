import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type DelightSignal = 'beaming' | 'pleased' | 'mixed' | 'dim' | 'dulled';

export interface DelightEvent {
  topic: string;
  signal: DelightSignal;
}

const WEIGHTS: Record<DelightSignal, number> = {
  beaming: 1,
  pleased: 0.8,
  mixed: 0.55,
  dim: 0.25,
  dulled: 0,
};

export type DelightBand = 'dulled' | 'dim' | 'mixed' | 'pleased' | 'untested';

export interface DelightRow {
  topic: string;
  n: number;
  score: number;
  band: DelightBand;
}

function bandFor(n: number, score: number): DelightBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'dulled';
  if (score < 0.55) return 'dim';
  if (score < 0.85) return 'mixed';
  return 'pleased';
}

export function summarizeDtmTopicDelightExpression(events: DelightEvent[]): DelightRow[] {
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
  const out: DelightRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function dulledDtmTopics(rows: DelightRow[]): DelightRow[] {
  return rows.filter((r) => r.band === 'dulled' || r.band === 'dim');
}
