import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type AffinityFlowSignal = 'aligned' | 'drawn' | 'mixed' | 'distant' | 'averse';

export interface AffinityFlowEvent {
  topic: string;
  signal: AffinityFlowSignal;
}

const WEIGHTS: Record<AffinityFlowSignal, number> = {
  aligned: 1,
  drawn: 0.8,
  mixed: 0.55,
  distant: 0.25,
  averse: 0,
};

export type AffinityFlowBand = 'averse' | 'distant' | 'mixed' | 'aligned' | 'untested';

export interface AffinityFlowRow {
  topic: string;
  n: number;
  score: number;
  band: AffinityFlowBand;
}

function bandFor(n: number, score: number): AffinityFlowBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'averse';
  if (score < 0.55) return 'distant';
  if (score < 0.85) return 'mixed';
  return 'aligned';
}

export function summarizeDtmTopicAffinityFlow(events: AffinityFlowEvent[]): AffinityFlowRow[] {
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
  const out: AffinityFlowRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function aversiveDtmTopics(rows: AffinityFlowRow[]): AffinityFlowRow[] {
  return rows.filter((r) => r.band === 'averse' || r.band === 'distant');
}
