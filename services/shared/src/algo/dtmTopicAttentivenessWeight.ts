import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type AttentivenessWeightSignal = 'attentive' | 'present' | 'mixed' | 'distracted' | 'absent';

export interface AttentivenessWeightEvent {
  topic: string;
  signal: AttentivenessWeightSignal;
}

const WEIGHTS: Record<AttentivenessWeightSignal, number> = {
  attentive: 1,
  present: 0.8,
  mixed: 0.55,
  distracted: 0.25,
  absent: 0,
};

export type AttentivenessWeightBand = 'absent' | 'distracted' | 'mixed' | 'attentive' | 'untested';

export interface AttentivenessWeightRow {
  topic: string;
  n: number;
  score: number;
  band: AttentivenessWeightBand;
}

function bandFor(n: number, score: number): AttentivenessWeightBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'absent';
  if (score < 0.55) return 'distracted';
  if (score < 0.85) return 'mixed';
  return 'attentive';
}

export function summarizeDtmTopicAttentivenessWeight(
  events: AttentivenessWeightEvent[],
): AttentivenessWeightRow[] {
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
  const out: AttentivenessWeightRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function absentDtmTopics(rows: AttentivenessWeightRow[]): AttentivenessWeightRow[] {
  return rows.filter((r) => r.band === 'absent' || r.band === 'distracted');
}
