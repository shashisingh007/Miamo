import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type TouchAffectionSignal =
  | 'sought-warm'
  | 'received-warm'
  | 'neutral-contact'
  | 'withdrawn'
  | 'avoided';

export interface TouchAffectionEvent {
  topic: string;
  signal: TouchAffectionSignal;
}

const WEIGHTS: Record<TouchAffectionSignal, number> = {
  'sought-warm': 1,
  'received-warm': 0.8,
  'neutral-contact': 0.55,
  'withdrawn': 0.25,
  'avoided': 0,
};

export type TouchAffectionBand = 'avoided' | 'distant' | 'connected' | 'affectionate' | 'untested';

export interface TouchAffectionRow {
  topic: string;
  n: number;
  score: number;
  band: TouchAffectionBand;
}

function bandFor(n: number, score: number): TouchAffectionBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'avoided';
  if (score < 0.55) return 'distant';
  if (score < 0.85) return 'connected';
  return 'affectionate';
}

export function summarizeDtmTopicTouchAffection(events: TouchAffectionEvent[]): TouchAffectionRow[] {
  const acc = new Map<string, { sum: number; n: number }>();
  for (const t of DTM_TOPIC_KEYS) acc.set(t, { sum: 0, n: 0 });
  for (const e of events) {
    if (!INDEX.has(e.topic)) continue;
    const w = WEIGHTS[e.signal];
    if (w === undefined) continue;
    const cell = acc.get(e.topic)!;
    cell.sum += w;
    cell.n += 1;
  }
  const out: TouchAffectionRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function avoidedDtmTopics(rows: TouchAffectionRow[]): TouchAffectionRow[] {
  return rows.filter((r) => r.band === 'avoided');
}
