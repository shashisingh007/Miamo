import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type AdmirationFlowSignal =
  | 'deep-admiration'
  | 'open-praise'
  | 'acknowledgement'
  | 'critical-stance'
  | 'contempt';

export interface AdmirationFlowEvent {
  topic: string;
  signal: AdmirationFlowSignal;
}

const WEIGHTS: Record<AdmirationFlowSignal, number> = {
  'deep-admiration': 1,
  'open-praise': 0.8,
  'acknowledgement': 0.55,
  'critical-stance': 0.25,
  'contempt': 0,
};

export type AdmirationFlowBand =
  | 'contempt'
  | 'critical'
  | 'acknowledging'
  | 'admiring'
  | 'untested';

export interface AdmirationFlowRow {
  topic: string;
  n: number;
  score: number;
  band: AdmirationFlowBand;
}

function bandFor(n: number, score: number): AdmirationFlowBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'contempt';
  if (score < 0.55) return 'critical';
  if (score < 0.85) return 'acknowledging';
  return 'admiring';
}

export function summarizeDtmTopicAdmirationFlow(
  events: AdmirationFlowEvent[],
): AdmirationFlowRow[] {
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
  const out: AdmirationFlowRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function contemptDtmTopics(rows: AdmirationFlowRow[]): AdmirationFlowRow[] {
  return rows.filter((r) => r.band === 'contempt');
}
