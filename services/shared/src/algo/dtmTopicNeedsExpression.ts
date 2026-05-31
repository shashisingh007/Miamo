import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type NeedsExpressionSignal =
  | 'direct-ask'
  | 'soft-ask'
  | 'hint'
  | 'avoidance'
  | 'suppressed';

export interface NeedsExpressionEvent {
  topic: string;
  signal: NeedsExpressionSignal;
}

const WEIGHTS: Record<NeedsExpressionSignal, number> = {
  'direct-ask': 1,
  'soft-ask': 0.8,
  'hint': 0.55,
  'avoidance': 0.25,
  'suppressed': 0,
};

export type NeedsExpressionBand =
  | 'suppressed'
  | 'avoidant'
  | 'hinting'
  | 'direct'
  | 'untested';

export interface NeedsExpressionRow {
  topic: string;
  n: number;
  score: number;
  band: NeedsExpressionBand;
}

function bandFor(n: number, score: number): NeedsExpressionBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'suppressed';
  if (score < 0.55) return 'avoidant';
  if (score < 0.85) return 'hinting';
  return 'direct';
}

export function summarizeDtmTopicNeedsExpression(
  events: NeedsExpressionEvent[],
): NeedsExpressionRow[] {
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
  const out: NeedsExpressionRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function suppressedDtmTopics(rows: NeedsExpressionRow[]): NeedsExpressionRow[] {
  return rows.filter((r) => r.band === 'suppressed');
}
