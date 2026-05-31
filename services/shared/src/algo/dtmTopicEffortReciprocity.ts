import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type EffortReciprocitySignal =
  | 'balanced'
  | 'leaning-in'
  | 'asymmetric'
  | 'one-sided'
  | 'extractive';

export interface EffortReciprocityEvent {
  topic: string;
  signal: EffortReciprocitySignal;
}

const WEIGHTS: Record<EffortReciprocitySignal, number> = {
  'balanced': 1,
  'leaning-in': 0.8,
  'asymmetric': 0.55,
  'one-sided': 0.25,
  'extractive': 0,
};

export type EffortReciprocityBand =
  | 'extractive'
  | 'one-sided'
  | 'tilted'
  | 'balanced'
  | 'untested';

export interface EffortReciprocityRow {
  topic: string;
  n: number;
  score: number;
  band: EffortReciprocityBand;
}

function bandFor(n: number, score: number): EffortReciprocityBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'extractive';
  if (score < 0.55) return 'one-sided';
  if (score < 0.85) return 'tilted';
  return 'balanced';
}

export function summarizeDtmTopicEffortReciprocity(
  events: EffortReciprocityEvent[],
): EffortReciprocityRow[] {
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
  const out: EffortReciprocityRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function extractiveDtmTopics(
  rows: EffortReciprocityRow[],
): EffortReciprocityRow[] {
  return rows.filter((r) => r.band === 'extractive');
}
