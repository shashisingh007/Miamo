import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type PatienceWeightSignal = 'patient' | 'composed' | 'mixed' | 'hurried' | 'impatient';

export interface PatienceWeightEvent {
  topic: string;
  signal: PatienceWeightSignal;
}

const WEIGHTS: Record<PatienceWeightSignal, number> = {
  patient: 1,
  composed: 0.8,
  mixed: 0.55,
  hurried: 0.25,
  impatient: 0,
};

export type PatienceWeightBand = 'impatient' | 'hurried' | 'mixed' | 'patient' | 'untested';

export interface PatienceWeightRow {
  topic: string;
  n: number;
  score: number;
  band: PatienceWeightBand;
}

function bandFor(n: number, score: number): PatienceWeightBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'impatient';
  if (score < 0.55) return 'hurried';
  if (score < 0.85) return 'mixed';
  return 'patient';
}

export function summarizeDtmTopicPatienceWeight(events: PatienceWeightEvent[]): PatienceWeightRow[] {
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
  const out: PatienceWeightRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function impatientDtmTopics(rows: PatienceWeightRow[]): PatienceWeightRow[] {
  return rows.filter((r) => r.band === 'impatient' || r.band === 'hurried');
}
