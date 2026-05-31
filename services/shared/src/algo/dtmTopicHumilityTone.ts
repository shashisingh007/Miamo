import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type HumilityToneSignal = 'humble' | 'modest' | 'mixed' | 'assertive' | 'arrogant';

export interface HumilityToneEvent {
  topic: string;
  signal: HumilityToneSignal;
}

const WEIGHTS: Record<HumilityToneSignal, number> = {
  humble: 1,
  modest: 0.8,
  mixed: 0.55,
  assertive: 0.25,
  arrogant: 0,
};

export type HumilityToneBand = 'arrogant' | 'assertive' | 'mixed' | 'modest' | 'untested';

export interface HumilityToneRow {
  topic: string;
  n: number;
  score: number;
  band: HumilityToneBand;
}

function bandFor(n: number, score: number): HumilityToneBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'arrogant';
  if (score < 0.55) return 'assertive';
  if (score < 0.85) return 'mixed';
  return 'modest';
}

export function summarizeDtmTopicHumilityTone(events: HumilityToneEvent[]): HumilityToneRow[] {
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
  const out: HumilityToneRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function arrogantDtmTopics(rows: HumilityToneRow[]): HumilityToneRow[] {
  return rows.filter((r) => r.band === 'arrogant' || r.band === 'assertive');
}
