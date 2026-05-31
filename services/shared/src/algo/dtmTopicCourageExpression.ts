import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type CourageExpressionSignal =
  | 'fully-courageous'
  | 'courageous'
  | 'hesitant'
  | 'shrinking'
  | 'cowed';

export interface CourageExpressionEvent {
  topic: string;
  signal: CourageExpressionSignal;
}

const WEIGHTS: Record<CourageExpressionSignal, number> = {
  'fully-courageous': 1,
  courageous: 0.8,
  hesitant: 0.55,
  shrinking: 0.25,
  cowed: 0,
};

export type CourageExpressionBand =
  | 'cowed'
  | 'shrinking'
  | 'hesitant'
  | 'courageous'
  | 'untested';

export interface CourageExpressionRow {
  topic: string;
  n: number;
  score: number;
  band: CourageExpressionBand;
}

function bandFor(n: number, score: number): CourageExpressionBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'cowed';
  if (score < 0.55) return 'shrinking';
  if (score < 0.85) return 'hesitant';
  return 'courageous';
}

export function summarizeDtmTopicCourageExpression(events: CourageExpressionEvent[]): CourageExpressionRow[] {
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
  const out: CourageExpressionRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function cowedDtmTopics(rows: CourageExpressionRow[]): CourageExpressionRow[] {
  return rows.filter((r) => r.band === 'cowed' || r.band === 'shrinking');
}
