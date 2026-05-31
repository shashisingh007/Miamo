import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type AutonomyExpressionSignal = 'autonomous' | 'self-led' | 'mixed' | 'enmeshed' | 'controlled';

export interface AutonomyExpressionEvent {
  topic: string;
  signal: AutonomyExpressionSignal;
}

const WEIGHTS: Record<AutonomyExpressionSignal, number> = {
  autonomous: 1,
  'self-led': 0.8,
  mixed: 0.55,
  enmeshed: 0.25,
  controlled: 0,
};

export type AutonomyExpressionBand = 'controlled' | 'enmeshed' | 'mixed' | 'autonomous' | 'untested';

export interface AutonomyExpressionRow {
  topic: string;
  n: number;
  score: number;
  band: AutonomyExpressionBand;
}

function bandFor(n: number, score: number): AutonomyExpressionBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'controlled';
  if (score < 0.55) return 'enmeshed';
  if (score < 0.85) return 'mixed';
  return 'autonomous';
}

export function summarizeDtmTopicAutonomyExpression(events: AutonomyExpressionEvent[]): AutonomyExpressionRow[] {
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
  const out: AutonomyExpressionRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function controlledDtmTopics(rows: AutonomyExpressionRow[]): AutonomyExpressionRow[] {
  return rows.filter((r) => r.band === 'controlled' || r.band === 'enmeshed');
}
