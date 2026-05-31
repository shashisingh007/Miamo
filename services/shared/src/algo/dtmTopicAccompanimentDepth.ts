import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type AccompanimentSignal =
  | 'fully-with'
  | 'attentive'
  | 'beside'
  | 'distracted'
  | 'absent';

export interface AccompanimentEvent {
  topic: string;
  signal: AccompanimentSignal;
}

const WEIGHTS: Record<AccompanimentSignal, number> = {
  'fully-with': 1,
  attentive: 0.8,
  beside: 0.55,
  distracted: 0.25,
  absent: 0,
};

export type AccompanimentBand =
  | 'absent'
  | 'distracted'
  | 'beside'
  | 'accompanied'
  | 'untested';

export interface AccompanimentRow {
  topic: string;
  n: number;
  score: number;
  band: AccompanimentBand;
}

function bandFor(n: number, score: number): AccompanimentBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'absent';
  if (score < 0.55) return 'distracted';
  if (score < 0.85) return 'beside';
  return 'accompanied';
}

export function summarizeDtmTopicAccompanimentDepth(events: AccompanimentEvent[]): AccompanimentRow[] {
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
  const out: AccompanimentRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function absentDtmTopics(rows: AccompanimentRow[]): AccompanimentRow[] {
  return rows.filter((r) => r.band === 'absent' || r.band === 'distracted');
}
