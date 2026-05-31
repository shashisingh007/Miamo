import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type AcceptanceCapacitySignal =
  | 'embracing'
  | 'accepting'
  | 'tolerating'
  | 'resisting'
  | 'rejecting';

export interface AcceptanceCapacityEvent {
  topic: string;
  signal: AcceptanceCapacitySignal;
}

const WEIGHTS: Record<AcceptanceCapacitySignal, number> = {
  embracing: 1,
  accepting: 0.8,
  tolerating: 0.55,
  resisting: 0.25,
  rejecting: 0,
};

export type AcceptanceCapacityBand =
  | 'rejecting'
  | 'resisting'
  | 'tolerating'
  | 'accepting'
  | 'untested';

export interface AcceptanceCapacityRow {
  topic: string;
  n: number;
  score: number;
  band: AcceptanceCapacityBand;
}

function bandFor(n: number, score: number): AcceptanceCapacityBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'rejecting';
  if (score < 0.55) return 'resisting';
  if (score < 0.85) return 'tolerating';
  return 'accepting';
}

export function summarizeDtmTopicAcceptanceCapacity(events: AcceptanceCapacityEvent[]): AcceptanceCapacityRow[] {
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
  const out: AcceptanceCapacityRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function rejectingDtmTopics(rows: AcceptanceCapacityRow[]): AcceptanceCapacityRow[] {
  return rows.filter((r) => r.band === 'rejecting' || r.band === 'resisting');
}
