import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type DeescalationAction =
  | 'soften-tone'
  | 'pause-break'
  | 'validate-feeling'
  | 'name-need'
  | 'escalate-volume'
  | 'sarcasm'
  | 'stonewall';

export interface DeescalationEvent {
  topic: string;
  action: DeescalationAction;
}

const WEIGHTS: Record<DeescalationAction, number> = {
  'soften-tone': 1,
  'pause-break': 0.9,
  'validate-feeling': 0.85,
  'name-need': 0.7,
  'escalate-volume': -1,
  sarcasm: -0.8,
  stonewall: -0.9,
};

export type DeescalationBand = 'volatile' | 'reactive' | 'regulating' | 'composed' | 'untested';

export interface DeescalationRow {
  topic: string;
  n: number;
  score: number;
  band: DeescalationBand;
}

function bandFor(n: number, score: number): DeescalationBand {
  if (n === 0) return 'untested';
  if (score < 0.4) return 'volatile';
  if (score < 0.6) return 'reactive';
  if (score < 0.8) return 'regulating';
  return 'composed';
}

export function summarizeDtmTopicConflictDeescalation(events: DeescalationEvent[]): DeescalationRow[] {
  const acc = new Map<string, { sum: number; n: number }>();
  for (const t of DTM_TOPIC_KEYS) acc.set(t, { sum: 0, n: 0 });
  for (const e of events) {
    if (!INDEX.has(e.topic)) continue;
    const w = WEIGHTS[e.action];
    if (w === undefined) continue;
    const cell = acc.get(e.topic)!;
    cell.sum += (w + 1) / 2;
    cell.n += 1;
  }
  const out: DeescalationRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function volatileDtmTopics(rows: DeescalationRow[]): DeescalationRow[] {
  return rows.filter((r) => r.band === 'volatile');
}
