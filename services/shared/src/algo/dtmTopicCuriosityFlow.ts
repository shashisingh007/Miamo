import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type CuriosityFlowSignal = 'curious' | 'inquisitive' | 'mixed' | 'incurious' | 'closedMinded';

export interface CuriosityFlowEvent {
  topic: string;
  signal: CuriosityFlowSignal;
}

const WEIGHTS: Record<CuriosityFlowSignal, number> = {
  curious: 1,
  inquisitive: 0.8,
  mixed: 0.55,
  incurious: 0.25,
  closedMinded: 0,
};

export type CuriosityFlowBand = 'closed' | 'incurious' | 'mixed' | 'curious' | 'untested';

export interface CuriosityFlowRow {
  topic: string;
  n: number;
  score: number;
  band: CuriosityFlowBand;
}

function bandFor(n: number, score: number): CuriosityFlowBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'closed';
  if (score < 0.55) return 'incurious';
  if (score < 0.85) return 'mixed';
  return 'curious';
}

export function summarizeDtmTopicCuriosityFlow(events: CuriosityFlowEvent[]): CuriosityFlowRow[] {
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
  const out: CuriosityFlowRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function closedDtmTopics(rows: CuriosityFlowRow[]): CuriosityFlowRow[] {
  return rows.filter((r) => r.band === 'closed' || r.band === 'incurious');
}
