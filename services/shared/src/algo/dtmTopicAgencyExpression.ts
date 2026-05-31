import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type AgencySignal =
  | 'choosing-freely'
  | 'asserting'
  | 'accommodating'
  | 'over-adapting'
  | 'self-erasing';

export interface AgencyEvent {
  topic: string;
  signal: AgencySignal;
}

const WEIGHTS: Record<AgencySignal, number> = {
  'choosing-freely': 1,
  asserting: 0.8,
  accommodating: 0.55,
  'over-adapting': 0.25,
  'self-erasing': 0,
};

export type AgencyBand =
  | 'self-erased'
  | 'over-adapted'
  | 'accommodating'
  | 'agentic'
  | 'untested';

export interface AgencyRow {
  topic: string;
  n: number;
  score: number;
  band: AgencyBand;
}

function bandFor(n: number, score: number): AgencyBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'self-erased';
  if (score < 0.55) return 'over-adapted';
  if (score < 0.85) return 'accommodating';
  return 'agentic';
}

export function summarizeDtmTopicAgencyExpression(events: AgencyEvent[]): AgencyRow[] {
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
  const out: AgencyRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function selfErasedDtmTopics(rows: AgencyRow[]): AgencyRow[] {
  return rows.filter((r) => r.band === 'self-erased' || r.band === 'over-adapted');
}
