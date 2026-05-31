import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type ReceptivityFlowSignal = 'open' | 'receptive' | 'mixed' | 'guarded' | 'closed';

export interface ReceptivityFlowEvent {
  topic: string;
  signal: ReceptivityFlowSignal;
}

const WEIGHTS: Record<ReceptivityFlowSignal, number> = {
  open: 1,
  receptive: 0.8,
  mixed: 0.55,
  guarded: 0.25,
  closed: 0,
};

export type ReceptivityFlowBand = 'closed' | 'guarded' | 'mixed' | 'open' | 'untested';

export interface ReceptivityFlowRow {
  topic: string;
  n: number;
  score: number;
  band: ReceptivityFlowBand;
}

function bandFor(n: number, score: number): ReceptivityFlowBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'closed';
  if (score < 0.55) return 'guarded';
  if (score < 0.85) return 'mixed';
  return 'open';
}

export function summarizeDtmTopicReceptivityFlow(events: ReceptivityFlowEvent[]): ReceptivityFlowRow[] {
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
  const out: ReceptivityFlowRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function guardedDtmTopics(rows: ReceptivityFlowRow[]): ReceptivityFlowRow[] {
  return rows.filter((r) => r.band === 'closed' || r.band === 'guarded');
}
