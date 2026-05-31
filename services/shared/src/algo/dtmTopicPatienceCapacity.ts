import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type PatienceCapacitySignal =
  | 'patient'
  | 'steady'
  | 'restless'
  | 'irritable'
  | 'impatient';

export interface PatienceCapacityEvent {
  topic: string;
  signal: PatienceCapacitySignal;
}

const WEIGHTS: Record<PatienceCapacitySignal, number> = {
  patient: 1,
  steady: 0.8,
  restless: 0.55,
  irritable: 0.25,
  impatient: 0,
};

export type PatienceCapacityBand =
  | 'impatient'
  | 'irritable'
  | 'restless'
  | 'patient'
  | 'untested';

export interface PatienceCapacityRow {
  topic: string;
  n: number;
  score: number;
  band: PatienceCapacityBand;
}

function bandFor(n: number, score: number): PatienceCapacityBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'impatient';
  if (score < 0.55) return 'irritable';
  if (score < 0.85) return 'restless';
  return 'patient';
}

export function summarizeDtmTopicPatienceCapacity(events: PatienceCapacityEvent[]): PatienceCapacityRow[] {
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
  const out: PatienceCapacityRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function impatientDtmTopics(rows: PatienceCapacityRow[]): PatienceCapacityRow[] {
  return rows.filter((r) => r.band === 'impatient' || r.band === 'irritable');
}
