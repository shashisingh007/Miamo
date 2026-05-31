import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type SincerityToneSignal = 'sincere' | 'genuine' | 'mixed' | 'performative' | 'insincere';

export interface SincerityToneEvent {
  topic: string;
  signal: SincerityToneSignal;
}

const WEIGHTS: Record<SincerityToneSignal, number> = {
  sincere: 1,
  genuine: 0.8,
  mixed: 0.55,
  performative: 0.25,
  insincere: 0,
};

export type SincerityToneBand = 'insincere' | 'performative' | 'mixed' | 'sincere' | 'untested';

export interface SincerityToneRow {
  topic: string;
  n: number;
  score: number;
  band: SincerityToneBand;
}

function bandFor(n: number, score: number): SincerityToneBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'insincere';
  if (score < 0.55) return 'performative';
  if (score < 0.85) return 'mixed';
  return 'sincere';
}

export function summarizeDtmTopicSincerityTone(events: SincerityToneEvent[]): SincerityToneRow[] {
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
  const out: SincerityToneRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function insincereDtmTopics(rows: SincerityToneRow[]): SincerityToneRow[] {
  return rows.filter((r) => r.band === 'insincere' || r.band === 'performative');
}
