import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type WarmthWeightSignal = 'warm' | 'cordial' | 'mixed' | 'cool' | 'cold';

export interface WarmthWeightEvent {
  topic: string;
  signal: WarmthWeightSignal;
}

const WEIGHTS: Record<WarmthWeightSignal, number> = {
  warm: 1,
  cordial: 0.8,
  mixed: 0.55,
  cool: 0.25,
  cold: 0,
};

export type WarmthWeightBand = 'cold' | 'cool' | 'mixed' | 'warm' | 'untested';

export interface WarmthWeightRow {
  topic: string;
  n: number;
  score: number;
  band: WarmthWeightBand;
}

function bandFor(n: number, score: number): WarmthWeightBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'cold';
  if (score < 0.55) return 'cool';
  if (score < 0.85) return 'mixed';
  return 'warm';
}

export function summarizeDtmTopicWarmthWeight(events: WarmthWeightEvent[]): WarmthWeightRow[] {
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
  const out: WarmthWeightRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function coldDtmTopics(rows: WarmthWeightRow[]): WarmthWeightRow[] {
  return rows.filter((r) => r.band === 'cold' || r.band === 'cool');
}
