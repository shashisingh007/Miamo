import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type LightnessToneSignal = 'light' | 'easy' | 'mixed' | 'heavy' | 'burdened';

export interface LightnessToneEvent {
  topic: string;
  signal: LightnessToneSignal;
}

const WEIGHTS: Record<LightnessToneSignal, number> = {
  light: 1,
  easy: 0.8,
  mixed: 0.55,
  heavy: 0.25,
  burdened: 0,
};

export type LightnessToneBand = 'burdened' | 'heavy' | 'mixed' | 'light' | 'untested';

export interface LightnessToneRow {
  topic: string;
  n: number;
  score: number;
  band: LightnessToneBand;
}

function bandFor(n: number, score: number): LightnessToneBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'burdened';
  if (score < 0.55) return 'heavy';
  if (score < 0.85) return 'mixed';
  return 'light';
}

export function summarizeDtmTopicLightnessTone(events: LightnessToneEvent[]): LightnessToneRow[] {
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
  const out: LightnessToneRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function burdenedDtmTopics(rows: LightnessToneRow[]): LightnessToneRow[] {
  return rows.filter((r) => r.band === 'burdened' || r.band === 'heavy');
}
