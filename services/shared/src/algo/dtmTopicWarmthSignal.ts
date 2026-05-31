import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type WarmthSignal = 'radiantly-warm' | 'warm' | 'lukewarm' | 'cool' | 'cold';

export interface WarmthSignalEvent {
  topic: string;
  signal: WarmthSignal;
}

const WEIGHTS: Record<WarmthSignal, number> = {
  'radiantly-warm': 1,
  warm: 0.8,
  lukewarm: 0.55,
  cool: 0.25,
  cold: 0,
};

export type WarmthBand = 'cold' | 'cool' | 'lukewarm' | 'warm' | 'untested';

export interface WarmthRow {
  topic: string;
  n: number;
  score: number;
  band: WarmthBand;
}

function bandFor(n: number, score: number): WarmthBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'cold';
  if (score < 0.55) return 'cool';
  if (score < 0.85) return 'lukewarm';
  return 'warm';
}

export function summarizeDtmTopicWarmthSignal(events: WarmthSignalEvent[]): WarmthRow[] {
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
  const out: WarmthRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function coldDtmTopics(rows: WarmthRow[]): WarmthRow[] {
  return rows.filter((r) => r.band === 'cold' || r.band === 'cool');
}
