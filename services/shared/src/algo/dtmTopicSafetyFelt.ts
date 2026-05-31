import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type SafetyFeltSignal =
  | 'fully-safe'
  | 'mostly-safe'
  | 'cautious'
  | 'guarded'
  | 'unsafe';

export interface SafetyFeltEvent {
  topic: string;
  signal: SafetyFeltSignal;
}

const WEIGHTS: Record<SafetyFeltSignal, number> = {
  'fully-safe': 1,
  'mostly-safe': 0.8,
  'cautious': 0.55,
  'guarded': 0.25,
  'unsafe': 0,
};

export type SafetyFeltBand =
  | 'unsafe'
  | 'guarded'
  | 'cautious'
  | 'safe'
  | 'untested';

export interface SafetyFeltRow {
  topic: string;
  n: number;
  score: number;
  band: SafetyFeltBand;
}

function bandFor(n: number, score: number): SafetyFeltBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'unsafe';
  if (score < 0.55) return 'guarded';
  if (score < 0.85) return 'cautious';
  return 'safe';
}

export function summarizeDtmTopicSafetyFelt(
  events: SafetyFeltEvent[],
): SafetyFeltRow[] {
  const acc = new Map<string, { sum: number; n: number }>();
  for (const t of DTM_TOPIC_KEYS) acc.set(t, { sum: 0, n: 0 });
  for (const e of events) {
    if (!INDEX.has(e.topic)) continue;
    const w = WEIGHTS[e.signal];
    if (w === undefined) continue;
    const cell = acc.get(e.topic)!;
    cell.sum += w;
    cell.n += 1;
  }
  const out: SafetyFeltRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function unsafeDtmTopics(rows: SafetyFeltRow[]): SafetyFeltRow[] {
  return rows.filter((r) => r.band === 'unsafe');
}
