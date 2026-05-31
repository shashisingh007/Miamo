import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type GratitudeAction =
  | 'thank-specific'
  | 'thank-generic'
  | 'appreciate-effort'
  | 'overlook'
  | 'criticize';

export interface GratitudeEvent {
  topic: string;
  action: GratitudeAction;
}

const WEIGHTS: Record<GratitudeAction, number> = {
  'thank-specific': 1,
  'thank-generic': 0.5,
  'appreciate-effort': 0.85,
  overlook: -0.5,
  criticize: -1,
};

export type GratitudeBand = 'critical' | 'taking' | 'noticing' | 'thanking' | 'untested';

export interface GratitudeFlowRow {
  topic: string;
  n: number;
  score: number;
  band: GratitudeBand;
}

function bandFor(n: number, score: number): GratitudeBand {
  if (n === 0) return 'untested';
  if (score < 0.35) return 'critical';
  if (score < 0.55) return 'taking';
  if (score < 0.8) return 'noticing';
  return 'thanking';
}

export function summarizeDtmTopicGratitudeFlow(events: GratitudeEvent[]): GratitudeFlowRow[] {
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
  const out: GratitudeFlowRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function criticalDtmTopics(rows: GratitudeFlowRow[]): GratitudeFlowRow[] {
  return rows.filter((r) => r.band === 'critical');
}
