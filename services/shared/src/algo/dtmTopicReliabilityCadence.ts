import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type ReliabilityCadenceSignal = 'reliable' | 'dependable' | 'mixed' | 'inconsistent' | 'unreliable';

export interface ReliabilityCadenceEvent {
  topic: string;
  signal: ReliabilityCadenceSignal;
}

const WEIGHTS: Record<ReliabilityCadenceSignal, number> = {
  reliable: 1,
  dependable: 0.8,
  mixed: 0.55,
  inconsistent: 0.25,
  unreliable: 0,
};

export type ReliabilityCadenceBand = 'unreliable' | 'inconsistent' | 'mixed' | 'reliable' | 'untested';

export interface ReliabilityCadenceRow {
  topic: string;
  n: number;
  score: number;
  band: ReliabilityCadenceBand;
}

function bandFor(n: number, score: number): ReliabilityCadenceBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'unreliable';
  if (score < 0.55) return 'inconsistent';
  if (score < 0.85) return 'mixed';
  return 'reliable';
}

export function summarizeDtmTopicReliabilityCadence(events: ReliabilityCadenceEvent[]): ReliabilityCadenceRow[] {
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
  const out: ReliabilityCadenceRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function unreliableDtmTopics(rows: ReliabilityCadenceRow[]): ReliabilityCadenceRow[] {
  return rows.filter((r) => r.band === 'unreliable' || r.band === 'inconsistent');
}
