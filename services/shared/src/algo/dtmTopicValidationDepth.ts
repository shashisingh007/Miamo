import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type ValidationDepthSignal =
  | 'deep-resonance'
  | 'reflective'
  | 'surface'
  | 'token'
  | 'invalidated';

export interface ValidationDepthEvent {
  topic: string;
  signal: ValidationDepthSignal;
}

const WEIGHTS: Record<ValidationDepthSignal, number> = {
  'deep-resonance': 1,
  'reflective': 0.8,
  'surface': 0.55,
  'token': 0.25,
  'invalidated': 0,
};

export type ValidationDepthBand =
  | 'invalidated'
  | 'token'
  | 'surface'
  | 'deep'
  | 'untested';

export interface ValidationDepthRow {
  topic: string;
  n: number;
  score: number;
  band: ValidationDepthBand;
}

function bandFor(n: number, score: number): ValidationDepthBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'invalidated';
  if (score < 0.55) return 'token';
  if (score < 0.85) return 'surface';
  return 'deep';
}

export function summarizeDtmTopicValidationDepth(
  events: ValidationDepthEvent[],
): ValidationDepthRow[] {
  const acc = new Map<string, { sum: number; n: number }>();
  for (const t of DTM_TOPIC_KEYS) acc.set(t, { sum: 0, n: 0 });
  for (const e of events) {
    if (!INDEX.has(e.topic)) continue;
    const w = WEIGHTS[e.signal];
    if (w === undefined) continue;
    const cell = acc.get(e.topic)!;
    cell.sum += w;
    cell.n += 1;
  }
  const out: ValidationDepthRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function invalidatedDtmTopics(rows: ValidationDepthRow[]): ValidationDepthRow[] {
  return rows.filter((r) => r.band === 'invalidated');
}
