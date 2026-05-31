import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type MatteringSignal =
  | 'central'
  | 'mattering'
  | 'incidental'
  | 'invisible'
  | 'devalued';

export interface MatteringEvent {
  topic: string;
  signal: MatteringSignal;
}

const WEIGHTS: Record<MatteringSignal, number> = {
  'central': 1,
  'mattering': 0.8,
  'incidental': 0.55,
  'invisible': 0.25,
  'devalued': 0,
};

export type MatteringBand =
  | 'devalued'
  | 'invisible'
  | 'incidental'
  | 'mattering'
  | 'untested';

export interface MatteringRow {
  topic: string;
  n: number;
  score: number;
  band: MatteringBand;
}

function bandFor(n: number, score: number): MatteringBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'devalued';
  if (score < 0.55) return 'invisible';
  if (score < 0.85) return 'incidental';
  return 'mattering';
}

export function summarizeDtmTopicMatteringSignal(events: MatteringEvent[]): MatteringRow[] {
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
  const out: MatteringRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function devaluedDtmTopics(rows: MatteringRow[]): MatteringRow[] {
  return rows.filter((r) => r.band === 'devalued' || r.band === 'invisible');
}
