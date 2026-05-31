import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type ProtectiveSignal =
  | 'guarding'
  | 'shielding'
  | 'mixed'
  | 'permeable'
  | 'exposed';

export interface ProtectiveEvent {
  topic: string;
  signal: ProtectiveSignal;
}

const WEIGHTS: Record<ProtectiveSignal, number> = {
  guarding: 1,
  shielding: 0.8,
  mixed: 0.55,
  permeable: 0.25,
  exposed: 0,
};

export type ProtectiveBand =
  | 'exposed'
  | 'permeable'
  | 'mixed'
  | 'shielding'
  | 'untested';

export interface ProtectiveRow {
  topic: string;
  n: number;
  score: number;
  band: ProtectiveBand;
}

function bandFor(n: number, score: number): ProtectiveBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'exposed';
  if (score < 0.55) return 'permeable';
  if (score < 0.85) return 'mixed';
  return 'shielding';
}

export function summarizeDtmTopicProtectiveStance(events: ProtectiveEvent[]): ProtectiveRow[] {
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
  const out: ProtectiveRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function exposedDtmTopics(rows: ProtectiveRow[]): ProtectiveRow[] {
  return rows.filter((r) => r.band === 'exposed' || r.band === 'permeable');
}
