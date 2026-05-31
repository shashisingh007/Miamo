import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type ValuingFlowSignal =
  | 'flowing-valuation'
  | 'steady-valuation'
  | 'partial-valuation'
  | 'sporadic-valuation'
  | 'stalled-valuation';

export interface ValuingFlowEvent {
  topic: string;
  signal: ValuingFlowSignal;
}

const WEIGHTS: Record<ValuingFlowSignal, number> = {
  'flowing-valuation': 1,
  'steady-valuation': 0.8,
  'partial-valuation': 0.55,
  'sporadic-valuation': 0.25,
  'stalled-valuation': 0,
};

export type ValuingFlowBand =
  | 'stalled'
  | 'sporadic'
  | 'partial'
  | 'flowing'
  | 'untested';

export interface ValuingFlowRow {
  topic: string;
  n: number;
  score: number;
  band: ValuingFlowBand;
}

function bandFor(n: number, score: number): ValuingFlowBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'stalled';
  if (score < 0.55) return 'sporadic';
  if (score < 0.85) return 'partial';
  return 'flowing';
}

export function summarizeDtmTopicValuingFlow(events: ValuingFlowEvent[]): ValuingFlowRow[] {
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
  const out: ValuingFlowRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function stalledDtmTopics(rows: ValuingFlowRow[]): ValuingFlowRow[] {
  return rows.filter((r) => r.band === 'stalled' || r.band === 'sporadic');
}
