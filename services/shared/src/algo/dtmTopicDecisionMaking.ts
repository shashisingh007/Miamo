import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type DecisionSignal =
  | 'co-decide'
  | 'consult-then-decide'
  | 'inform-after'
  | 'unilateral'
  | 'override';

export interface DecisionEvent {
  topic: string;
  signal: DecisionSignal;
}

const WEIGHTS: Record<DecisionSignal, number> = {
  'co-decide': 1,
  'consult-then-decide': 0.75,
  'inform-after': 0.4,
  unilateral: 0.15,
  override: 0,
};

export type DecisionBand = 'authoritarian' | 'asymmetric' | 'collaborative' | 'partnered' | 'untested';

export interface DecisionRow {
  topic: string;
  n: number;
  score: number;
  band: DecisionBand;
}

function bandFor(n: number, score: number): DecisionBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'authoritarian';
  if (score < 0.55) return 'asymmetric';
  if (score < 0.85) return 'collaborative';
  return 'partnered';
}

export function summarizeDtmTopicDecisionMaking(events: DecisionEvent[]): DecisionRow[] {
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
  const out: DecisionRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function authoritarianDtmTopics(rows: DecisionRow[]): DecisionRow[] {
  return rows.filter((r) => r.band === 'authoritarian');
}
