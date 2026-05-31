import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type ReachingTowardSignal =
  | 'leaning-in'
  | 'reaching'
  | 'tentative'
  | 'withdrawing'
  | 'turned-away';

export interface ReachingTowardEvent {
  topic: string;
  signal: ReachingTowardSignal;
}

const WEIGHTS: Record<ReachingTowardSignal, number> = {
  'leaning-in': 1,
  reaching: 0.8,
  tentative: 0.55,
  withdrawing: 0.25,
  'turned-away': 0,
};

export type ReachingTowardBand =
  | 'turned-away'
  | 'withdrawing'
  | 'tentative'
  | 'reaching'
  | 'untested';

export interface ReachingTowardRow {
  topic: string;
  n: number;
  score: number;
  band: ReachingTowardBand;
}

function bandFor(n: number, score: number): ReachingTowardBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'turned-away';
  if (score < 0.55) return 'withdrawing';
  if (score < 0.85) return 'tentative';
  return 'reaching';
}

export function summarizeDtmTopicReachingToward(events: ReachingTowardEvent[]): ReachingTowardRow[] {
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
  const out: ReachingTowardRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function turnedAwayDtmTopics(rows: ReachingTowardRow[]): ReachingTowardRow[] {
  return rows.filter((r) => r.band === 'turned-away' || r.band === 'withdrawing');
}
