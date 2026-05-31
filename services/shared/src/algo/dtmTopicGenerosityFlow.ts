import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type GenerosityFlowSignal =
  | 'lavish'
  | 'generous'
  | 'measured'
  | 'stingy'
  | 'withholding';

export interface GenerosityFlowEvent {
  topic: string;
  signal: GenerosityFlowSignal;
}

const WEIGHTS: Record<GenerosityFlowSignal, number> = {
  lavish: 1,
  generous: 0.8,
  measured: 0.55,
  stingy: 0.25,
  withholding: 0,
};

export type GenerosityFlowBand =
  | 'withholding'
  | 'stingy'
  | 'measured'
  | 'generous'
  | 'untested';

export interface GenerosityFlowRow {
  topic: string;
  n: number;
  score: number;
  band: GenerosityFlowBand;
}

function bandFor(n: number, score: number): GenerosityFlowBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'withholding';
  if (score < 0.55) return 'stingy';
  if (score < 0.85) return 'measured';
  return 'generous';
}

export function summarizeDtmTopicGenerosityFlow(events: GenerosityFlowEvent[]): GenerosityFlowRow[] {
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
  const out: GenerosityFlowRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function withholdingDtmTopics(rows: GenerosityFlowRow[]): GenerosityFlowRow[] {
  return rows.filter((r) => r.band === 'withholding' || r.band === 'stingy');
}
