import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type GratitudeExpressionSignal =
  | 'effusive'
  | 'grateful'
  | 'polite'
  | 'sparing'
  | 'absent';

export interface GratitudeExpressionEvent {
  topic: string;
  signal: GratitudeExpressionSignal;
}

const WEIGHTS: Record<GratitudeExpressionSignal, number> = {
  effusive: 1,
  grateful: 0.8,
  polite: 0.55,
  sparing: 0.25,
  absent: 0,
};

export type GratitudeExpressionBand =
  | 'absent'
  | 'sparing'
  | 'polite'
  | 'grateful'
  | 'untested';

export interface GratitudeExpressionRow {
  topic: string;
  n: number;
  score: number;
  band: GratitudeExpressionBand;
}

function bandFor(n: number, score: number): GratitudeExpressionBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'absent';
  if (score < 0.55) return 'sparing';
  if (score < 0.85) return 'polite';
  return 'grateful';
}

export function summarizeDtmTopicGratitudeExpression(events: GratitudeExpressionEvent[]): GratitudeExpressionRow[] {
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
  const out: GratitudeExpressionRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function absentGratitudeDtmTopics(rows: GratitudeExpressionRow[]): GratitudeExpressionRow[] {
  return rows.filter((r) => r.band === 'absent' || r.band === 'sparing');
}
