import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type PatienceQualitySignal = 'patient' | 'steady' | 'mixed' | 'restless' | 'impatient';

export interface PatienceQualityEvent {
  topic: string;
  signal: PatienceQualitySignal;
}

const WEIGHTS: Record<PatienceQualitySignal, number> = {
  patient: 1,
  steady: 0.8,
  mixed: 0.55,
  restless: 0.25,
  impatient: 0,
};

export type PatienceQualityBand = 'impatient' | 'restless' | 'mixed' | 'patient' | 'untested';

export interface PatienceQualityRow {
  topic: string;
  n: number;
  score: number;
  band: PatienceQualityBand;
}

function bandFor(n: number, score: number): PatienceQualityBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'impatient';
  if (score < 0.55) return 'restless';
  if (score < 0.85) return 'mixed';
  return 'patient';
}

export function summarizeDtmTopicPatienceQuality(events: PatienceQualityEvent[]): PatienceQualityRow[] {
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
  const out: PatienceQualityRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function impatientDtmTopics(rows: PatienceQualityRow[]): PatienceQualityRow[] {
  return rows.filter((r) => r.band === 'impatient' || r.band === 'restless');
}
