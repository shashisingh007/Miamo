import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type ReceptivityOpennessSignal =
  | 'open'
  | 'receptive'
  | 'cautious'
  | 'guarded'
  | 'closed';

export interface ReceptivityOpennessEvent {
  topic: string;
  signal: ReceptivityOpennessSignal;
}

const WEIGHTS: Record<ReceptivityOpennessSignal, number> = {
  open: 1,
  receptive: 0.8,
  cautious: 0.55,
  guarded: 0.25,
  closed: 0,
};

export type ReceptivityOpennessBand =
  | 'closed'
  | 'guarded'
  | 'cautious'
  | 'receptive'
  | 'untested';

export interface ReceptivityOpennessRow {
  topic: string;
  n: number;
  score: number;
  band: ReceptivityOpennessBand;
}

function bandFor(n: number, score: number): ReceptivityOpennessBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'closed';
  if (score < 0.55) return 'guarded';
  if (score < 0.85) return 'cautious';
  return 'receptive';
}

export function summarizeDtmTopicReceptivityOpenness(events: ReceptivityOpennessEvent[]): ReceptivityOpennessRow[] {
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
  const out: ReceptivityOpennessRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function closedReceptivityDtmTopics(rows: ReceptivityOpennessRow[]): ReceptivityOpennessRow[] {
  return rows.filter((r) => r.band === 'closed' || r.band === 'guarded');
}
