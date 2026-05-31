import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type PatienceFlowSignal = 'steady' | 'slow' | 'mixed' | 'urgent' | 'reactive';

export interface PatienceFlowEvent {
  topic: string;
  signal: PatienceFlowSignal;
}

const WEIGHTS: Record<PatienceFlowSignal, number> = {
  steady: 1,
  slow: 0.8,
  mixed: 0.55,
  urgent: 0.25,
  reactive: 0,
};

export type PatienceFlowBand = 'reactive' | 'urgent' | 'mixed' | 'slow' | 'untested';

export interface PatienceFlowRow {
  topic: string;
  n: number;
  score: number;
  band: PatienceFlowBand;
}

function bandFor(n: number, score: number): PatienceFlowBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'reactive';
  if (score < 0.55) return 'urgent';
  if (score < 0.85) return 'mixed';
  return 'slow';
}

export function summarizeDtmTopicPatienceFlow(events: PatienceFlowEvent[]): PatienceFlowRow[] {
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
  const out: PatienceFlowRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function reactiveDtmTopics(rows: PatienceFlowRow[]): PatienceFlowRow[] {
  return rows.filter((r) => r.band === 'reactive' || r.band === 'urgent');
}
