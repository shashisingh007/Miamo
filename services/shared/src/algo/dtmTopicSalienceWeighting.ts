import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type SalienceSignal =
  | 'foreground-priority'
  | 'foreground'
  | 'background'
  | 'noise'
  | 'erased';

export interface SalienceEvent {
  topic: string;
  signal: SalienceSignal;
}

const WEIGHTS: Record<SalienceSignal, number> = {
  'foreground-priority': 1,
  foreground: 0.8,
  background: 0.55,
  noise: 0.25,
  erased: 0,
};

export type SalienceBand =
  | 'erased'
  | 'noise'
  | 'background'
  | 'foreground'
  | 'untested';

export interface SalienceRow {
  topic: string;
  n: number;
  score: number;
  band: SalienceBand;
}

function bandFor(n: number, score: number): SalienceBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'erased';
  if (score < 0.55) return 'noise';
  if (score < 0.85) return 'background';
  return 'foreground';
}

export function summarizeDtmTopicSalienceWeighting(events: SalienceEvent[]): SalienceRow[] {
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
  const out: SalienceRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function erasedDtmTopics(rows: SalienceRow[]): SalienceRow[] {
  return rows.filter((r) => r.band === 'erased' || r.band === 'noise');
}
