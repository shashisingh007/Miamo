import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type InterdependenceSignal =
  | 'collaborative'
  | 'cooperative'
  | 'parallel'
  | 'isolated'
  | 'extractive';

export interface InterdependenceEvent {
  topic: string;
  signal: InterdependenceSignal;
}

const WEIGHTS: Record<InterdependenceSignal, number> = {
  collaborative: 1,
  cooperative: 0.8,
  parallel: 0.55,
  isolated: 0.25,
  extractive: 0,
};

export type InterdependenceBand =
  | 'extractive'
  | 'isolated'
  | 'parallel'
  | 'collaborative'
  | 'untested';

export interface InterdependenceRow {
  topic: string;
  n: number;
  score: number;
  band: InterdependenceBand;
}

function bandFor(n: number, score: number): InterdependenceBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'extractive';
  if (score < 0.55) return 'isolated';
  if (score < 0.85) return 'parallel';
  return 'collaborative';
}

export function summarizeDtmTopicInterdependenceCapacity(events: InterdependenceEvent[]): InterdependenceRow[] {
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
  const out: InterdependenceRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function isolatedDtmTopics(rows: InterdependenceRow[]): InterdependenceRow[] {
  return rows.filter((r) => r.band === 'extractive' || r.band === 'isolated');
}
