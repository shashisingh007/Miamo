import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type AvailabilityCadenceSignal = 'available' | 'reachable' | 'mixed' | 'scarce' | 'unavailable';

export interface AvailabilityCadenceEvent {
  topic: string;
  signal: AvailabilityCadenceSignal;
}

const WEIGHTS: Record<AvailabilityCadenceSignal, number> = {
  available: 1,
  reachable: 0.8,
  mixed: 0.55,
  scarce: 0.25,
  unavailable: 0,
};

export type AvailabilityCadenceBand = 'unavailable' | 'scarce' | 'mixed' | 'available' | 'untested';

export interface AvailabilityCadenceRow {
  topic: string;
  n: number;
  score: number;
  band: AvailabilityCadenceBand;
}

function bandFor(n: number, score: number): AvailabilityCadenceBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'unavailable';
  if (score < 0.55) return 'scarce';
  if (score < 0.85) return 'mixed';
  return 'available';
}

export function summarizeDtmTopicAvailabilityCadence(events: AvailabilityCadenceEvent[]): AvailabilityCadenceRow[] {
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
  const out: AvailabilityCadenceRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function unavailableDtmTopics(rows: AvailabilityCadenceRow[]): AvailabilityCadenceRow[] {
  return rows.filter((r) => r.band === 'unavailable' || r.band === 'scarce');
}
