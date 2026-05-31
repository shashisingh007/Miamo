import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type AuthenticityExpressionSignal =
  | 'aligned'
  | 'authentic'
  | 'partial'
  | 'performative'
  | 'masked';

export interface AuthenticityExpressionEvent {
  topic: string;
  signal: AuthenticityExpressionSignal;
}

const WEIGHTS: Record<AuthenticityExpressionSignal, number> = {
  aligned: 1,
  authentic: 0.8,
  partial: 0.55,
  performative: 0.25,
  masked: 0,
};

export type AuthenticityExpressionBand =
  | 'masked'
  | 'performative'
  | 'partial'
  | 'authentic'
  | 'untested';

export interface AuthenticityExpressionRow {
  topic: string;
  n: number;
  score: number;
  band: AuthenticityExpressionBand;
}

function bandFor(n: number, score: number): AuthenticityExpressionBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'masked';
  if (score < 0.55) return 'performative';
  if (score < 0.85) return 'partial';
  return 'authentic';
}

export function summarizeDtmTopicAuthenticityExpression(events: AuthenticityExpressionEvent[]): AuthenticityExpressionRow[] {
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
  const out: AuthenticityExpressionRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function maskedDtmTopics(rows: AuthenticityExpressionRow[]): AuthenticityExpressionRow[] {
  return rows.filter((r) => r.band === 'masked' || r.band === 'performative');
}
