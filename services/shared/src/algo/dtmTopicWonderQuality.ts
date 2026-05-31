import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type WonderSignal = 'awe' | 'curious' | 'mixed' | 'flat' | 'jaded';

export interface WonderEvent {
  topic: string;
  signal: WonderSignal;
}

const WEIGHTS: Record<WonderSignal, number> = {
  awe: 1,
  curious: 0.8,
  mixed: 0.55,
  flat: 0.25,
  jaded: 0,
};

export type WonderBand = 'jaded' | 'flat' | 'mixed' | 'curious' | 'untested';

export interface WonderRow {
  topic: string;
  n: number;
  score: number;
  band: WonderBand;
}

function bandFor(n: number, score: number): WonderBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'jaded';
  if (score < 0.55) return 'flat';
  if (score < 0.85) return 'mixed';
  return 'curious';
}

export function summarizeDtmTopicWonderQuality(events: WonderEvent[]): WonderRow[] {
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
  const out: WonderRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function jadedDtmTopics(rows: WonderRow[]): WonderRow[] {
  return rows.filter((r) => r.band === 'jaded' || r.band === 'flat');
}
