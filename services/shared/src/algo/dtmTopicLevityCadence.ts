import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type LevityCadenceSignal = 'buoyant' | 'light' | 'mixed' | 'heavy' | 'leaden';

export interface LevityCadenceEvent {
  topic: string;
  signal: LevityCadenceSignal;
}

const WEIGHTS: Record<LevityCadenceSignal, number> = {
  buoyant: 1,
  light: 0.8,
  mixed: 0.55,
  heavy: 0.25,
  leaden: 0,
};

export type LevityCadenceBand = 'leaden' | 'heavy' | 'mixed' | 'light' | 'untested';

export interface LevityCadenceRow {
  topic: string;
  n: number;
  score: number;
  band: LevityCadenceBand;
}

function bandFor(n: number, score: number): LevityCadenceBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'leaden';
  if (score < 0.55) return 'heavy';
  if (score < 0.85) return 'mixed';
  return 'light';
}

export function summarizeDtmTopicLevityCadence(events: LevityCadenceEvent[]): LevityCadenceRow[] {
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
  const out: LevityCadenceRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function leadenDtmTopics(rows: LevityCadenceRow[]): LevityCadenceRow[] {
  return rows.filter((r) => r.band === 'leaden' || r.band === 'heavy');
}
