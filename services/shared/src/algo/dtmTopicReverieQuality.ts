import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type ReverieSignal = 'immersed' | 'wandering' | 'mixed' | 'distracted' | 'jolted';

export interface ReverieEvent {
  topic: string;
  signal: ReverieSignal;
}

const WEIGHTS: Record<ReverieSignal, number> = {
  immersed: 1,
  wandering: 0.8,
  mixed: 0.55,
  distracted: 0.25,
  jolted: 0,
};

export type ReverieBand = 'jolted' | 'distracted' | 'mixed' | 'wandering' | 'untested';

export interface ReverieRow {
  topic: string;
  n: number;
  score: number;
  band: ReverieBand;
}

function bandFor(n: number, score: number): ReverieBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'jolted';
  if (score < 0.55) return 'distracted';
  if (score < 0.85) return 'mixed';
  return 'wandering';
}

export function summarizeDtmTopicReverieQuality(events: ReverieEvent[]): ReverieRow[] {
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
  const out: ReverieRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function joltedDtmTopics(rows: ReverieRow[]): ReverieRow[] {
  return rows.filter((r) => r.band === 'jolted' || r.band === 'distracted');
}
