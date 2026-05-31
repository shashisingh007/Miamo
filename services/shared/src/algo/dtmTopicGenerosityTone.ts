import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type GenerosityToneSignal = 'generous' | 'giving' | 'mixed' | 'withholding' | 'stingy';

export interface GenerosityToneEvent {
  topic: string;
  signal: GenerosityToneSignal;
}

const WEIGHTS: Record<GenerosityToneSignal, number> = {
  generous: 1,
  giving: 0.8,
  mixed: 0.55,
  withholding: 0.25,
  stingy: 0,
};

export type GenerosityToneBand = 'stingy' | 'withholding' | 'mixed' | 'generous' | 'untested';

export interface GenerosityToneRow {
  topic: string;
  n: number;
  score: number;
  band: GenerosityToneBand;
}

function bandFor(n: number, score: number): GenerosityToneBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'stingy';
  if (score < 0.55) return 'withholding';
  if (score < 0.85) return 'mixed';
  return 'generous';
}

export function summarizeDtmTopicGenerosityTone(
  events: GenerosityToneEvent[],
): GenerosityToneRow[] {
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
  const out: GenerosityToneRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function stingyDtmTopics(rows: GenerosityToneRow[]): GenerosityToneRow[] {
  return rows.filter((r) => r.band === 'stingy' || r.band === 'withholding');
}
