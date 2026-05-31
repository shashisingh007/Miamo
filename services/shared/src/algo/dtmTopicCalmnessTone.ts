import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type CalmnessToneSignal = 'calm' | 'composed' | 'mixed' | 'tense' | 'agitated';

export interface CalmnessToneEvent {
  topic: string;
  signal: CalmnessToneSignal;
}

const WEIGHTS: Record<CalmnessToneSignal, number> = {
  calm: 1,
  composed: 0.8,
  mixed: 0.55,
  tense: 0.25,
  agitated: 0,
};

export type CalmnessToneBand = 'agitated' | 'tense' | 'mixed' | 'calm' | 'untested';

export interface CalmnessToneRow {
  topic: string;
  n: number;
  score: number;
  band: CalmnessToneBand;
}

function bandFor(n: number, score: number): CalmnessToneBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'agitated';
  if (score < 0.55) return 'tense';
  if (score < 0.85) return 'mixed';
  return 'calm';
}

export function summarizeDtmTopicCalmnessTone(events: CalmnessToneEvent[]): CalmnessToneRow[] {
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
  const out: CalmnessToneRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function agitatedDtmTopics(rows: CalmnessToneRow[]): CalmnessToneRow[] {
  return rows.filter((r) => r.band === 'agitated' || r.band === 'tense');
}
