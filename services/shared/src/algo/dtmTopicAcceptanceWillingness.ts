import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type AcceptanceWillingnessSignal = 'embracing' | 'accepting' | 'mixed' | 'reluctant' | 'rejecting';

export interface AcceptanceWillingnessEvent {
  topic: string;
  signal: AcceptanceWillingnessSignal;
}

const WEIGHTS: Record<AcceptanceWillingnessSignal, number> = {
  embracing: 1,
  accepting: 0.8,
  mixed: 0.55,
  reluctant: 0.25,
  rejecting: 0,
};

export type AcceptanceWillingnessBand = 'rejecting' | 'reluctant' | 'mixed' | 'embracing' | 'untested';

export interface AcceptanceWillingnessRow {
  topic: string;
  n: number;
  score: number;
  band: AcceptanceWillingnessBand;
}

function bandFor(n: number, score: number): AcceptanceWillingnessBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'rejecting';
  if (score < 0.55) return 'reluctant';
  if (score < 0.85) return 'mixed';
  return 'embracing';
}

export function summarizeDtmTopicAcceptanceWillingness(events: AcceptanceWillingnessEvent[]): AcceptanceWillingnessRow[] {
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
  const out: AcceptanceWillingnessRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function rejectingDtmTopics(rows: AcceptanceWillingnessRow[]): AcceptanceWillingnessRow[] {
  return rows.filter((r) => r.band === 'rejecting' || r.band === 'reluctant');
}
