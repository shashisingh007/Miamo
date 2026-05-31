import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type HopeStanceSignal = 'hopeful' | 'optimistic' | 'mixed' | 'doubtful' | 'despairing';

export interface HopeStanceEvent {
  topic: string;
  signal: HopeStanceSignal;
}

const WEIGHTS: Record<HopeStanceSignal, number> = {
  hopeful: 1,
  optimistic: 0.8,
  mixed: 0.55,
  doubtful: 0.25,
  despairing: 0,
};

export type HopeStanceBand = 'despairing' | 'doubtful' | 'mixed' | 'optimistic' | 'untested';

export interface HopeStanceRow {
  topic: string;
  n: number;
  score: number;
  band: HopeStanceBand;
}

function bandFor(n: number, score: number): HopeStanceBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'despairing';
  if (score < 0.55) return 'doubtful';
  if (score < 0.85) return 'mixed';
  return 'optimistic';
}

export function summarizeDtmTopicHopeStance(events: HopeStanceEvent[]): HopeStanceRow[] {
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
  const out: HopeStanceRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function despairingDtmTopics(rows: HopeStanceRow[]): HopeStanceRow[] {
  return rows.filter((r) => r.band === 'despairing' || r.band === 'doubtful');
}
