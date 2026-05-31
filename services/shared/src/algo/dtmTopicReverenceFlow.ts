import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type ReverenceFlowSignal = 'reverent' | 'respectful' | 'mixed' | 'casual' | 'dismissive';

export interface ReverenceFlowEvent {
  topic: string;
  signal: ReverenceFlowSignal;
}

const WEIGHTS: Record<ReverenceFlowSignal, number> = {
  reverent: 1,
  respectful: 0.8,
  mixed: 0.55,
  casual: 0.25,
  dismissive: 0,
};

export type ReverenceFlowBand = 'dismissive' | 'casual' | 'mixed' | 'reverent' | 'untested';

export interface ReverenceFlowRow {
  topic: string;
  n: number;
  score: number;
  band: ReverenceFlowBand;
}

function bandFor(n: number, score: number): ReverenceFlowBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'dismissive';
  if (score < 0.55) return 'casual';
  if (score < 0.85) return 'mixed';
  return 'reverent';
}

export function summarizeDtmTopicReverenceFlow(events: ReverenceFlowEvent[]): ReverenceFlowRow[] {
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
  const out: ReverenceFlowRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function dismissiveDtmTopics(rows: ReverenceFlowRow[]): ReverenceFlowRow[] {
  return rows.filter((r) => r.band === 'dismissive' || r.band === 'casual');
}
