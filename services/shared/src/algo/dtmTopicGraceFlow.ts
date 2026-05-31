import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type GraceFlowSignal = 'graceful' | 'flowing' | 'mixed' | 'awkward' | 'jarring';

export interface GraceFlowEvent {
  topic: string;
  signal: GraceFlowSignal;
}

const WEIGHTS: Record<GraceFlowSignal, number> = {
  graceful: 1,
  flowing: 0.8,
  mixed: 0.55,
  awkward: 0.25,
  jarring: 0,
};

export type GraceFlowBand = 'jarring' | 'awkward' | 'mixed' | 'graceful' | 'untested';

export interface GraceFlowRow {
  topic: string;
  n: number;
  score: number;
  band: GraceFlowBand;
}

function bandFor(n: number, score: number): GraceFlowBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'jarring';
  if (score < 0.55) return 'awkward';
  if (score < 0.85) return 'mixed';
  return 'graceful';
}

export function summarizeDtmTopicGraceFlow(events: GraceFlowEvent[]): GraceFlowRow[] {
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
  const out: GraceFlowRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function jarringDtmTopics(rows: GraceFlowRow[]): GraceFlowRow[] {
  return rows.filter((r) => r.band === 'jarring' || r.band === 'awkward');
}
