import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type EmpathyFlowSignal = 'empathic' | 'compassionate' | 'mixed' | 'detached' | 'callous';

export interface EmpathyFlowEvent {
  topic: string;
  signal: EmpathyFlowSignal;
}

const WEIGHTS: Record<EmpathyFlowSignal, number> = {
  empathic: 1,
  compassionate: 0.8,
  mixed: 0.55,
  detached: 0.25,
  callous: 0,
};

export type EmpathyFlowBand = 'callous' | 'detached' | 'mixed' | 'empathic' | 'untested';

export interface EmpathyFlowRow {
  topic: string;
  n: number;
  score: number;
  band: EmpathyFlowBand;
}

function bandFor(n: number, score: number): EmpathyFlowBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'callous';
  if (score < 0.55) return 'detached';
  if (score < 0.85) return 'mixed';
  return 'empathic';
}

export function summarizeDtmTopicEmpathyFlow(events: EmpathyFlowEvent[]): EmpathyFlowRow[] {
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
  const out: EmpathyFlowRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function callousDtmTopics(rows: EmpathyFlowRow[]): EmpathyFlowRow[] {
  return rows.filter((r) => r.band === 'callous' || r.band === 'detached');
}
