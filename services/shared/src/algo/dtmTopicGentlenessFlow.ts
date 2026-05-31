import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type GentlenessFlowSignal = 'soft' | 'gentle' | 'mixed' | 'firm' | 'harsh';

export interface GentlenessFlowEvent {
  topic: string;
  signal: GentlenessFlowSignal;
}

const WEIGHTS: Record<GentlenessFlowSignal, number> = {
  soft: 1,
  gentle: 0.8,
  mixed: 0.55,
  firm: 0.25,
  harsh: 0,
};

export type GentlenessFlowBand = 'harsh' | 'firm' | 'mixed' | 'gentle' | 'untested';

export interface GentlenessFlowRow {
  topic: string;
  n: number;
  score: number;
  band: GentlenessFlowBand;
}

function bandFor(n: number, score: number): GentlenessFlowBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'harsh';
  if (score < 0.55) return 'firm';
  if (score < 0.85) return 'mixed';
  return 'gentle';
}

export function summarizeDtmTopicGentlenessFlow(events: GentlenessFlowEvent[]): GentlenessFlowRow[] {
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
  const out: GentlenessFlowRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function harshDtmTopics(rows: GentlenessFlowRow[]): GentlenessFlowRow[] {
  return rows.filter((r) => r.band === 'harsh' || r.band === 'firm');
}
