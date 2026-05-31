import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type ApologyToneSignal = 'apologetic' | 'remorseful' | 'mixed' | 'defensive' | 'unrepentant';

export interface ApologyToneEvent {
  topic: string;
  signal: ApologyToneSignal;
}

const WEIGHTS: Record<ApologyToneSignal, number> = {
  apologetic: 1,
  remorseful: 0.8,
  mixed: 0.55,
  defensive: 0.25,
  unrepentant: 0,
};

export type ApologyToneBand = 'unrepentant' | 'defensive' | 'mixed' | 'apologetic' | 'untested';

export interface ApologyToneRow {
  topic: string;
  n: number;
  score: number;
  band: ApologyToneBand;
}

function bandFor(n: number, score: number): ApologyToneBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'unrepentant';
  if (score < 0.55) return 'defensive';
  if (score < 0.85) return 'mixed';
  return 'apologetic';
}

export function summarizeDtmTopicApologyTone(events: ApologyToneEvent[]): ApologyToneRow[] {
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
  const out: ApologyToneRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function unrepentantDtmTopics(rows: ApologyToneRow[]): ApologyToneRow[] {
  return rows.filter((r) => r.band === 'unrepentant' || r.band === 'defensive');
}
