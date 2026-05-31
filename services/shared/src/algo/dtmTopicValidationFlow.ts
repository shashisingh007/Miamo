import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type ValidationFlowSignal = 'affirming' | 'validating' | 'mixed' | 'minimizing' | 'invalidating';

export interface ValidationFlowEvent {
  topic: string;
  signal: ValidationFlowSignal;
}

const WEIGHTS: Record<ValidationFlowSignal, number> = {
  affirming: 1,
  validating: 0.8,
  mixed: 0.55,
  minimizing: 0.25,
  invalidating: 0,
};

export type ValidationFlowBand = 'invalidating' | 'minimizing' | 'mixed' | 'affirming' | 'untested';

export interface ValidationFlowRow {
  topic: string;
  n: number;
  score: number;
  band: ValidationFlowBand;
}

function bandFor(n: number, score: number): ValidationFlowBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'invalidating';
  if (score < 0.55) return 'minimizing';
  if (score < 0.85) return 'mixed';
  return 'affirming';
}

export function summarizeDtmTopicValidationFlow(events: ValidationFlowEvent[]): ValidationFlowRow[] {
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
  const out: ValidationFlowRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function invalidatingDtmTopics(rows: ValidationFlowRow[]): ValidationFlowRow[] {
  return rows.filter((r) => r.band === 'invalidating' || r.band === 'minimizing');
}
