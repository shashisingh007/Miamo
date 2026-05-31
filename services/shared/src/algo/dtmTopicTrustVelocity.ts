import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type TrustVelocitySignal =
  | 'rapid-build'
  | 'steady-build'
  | 'cautious'
  | 'stalled'
  | 'eroding';

export interface TrustVelocityEvent {
  topic: string;
  signal: TrustVelocitySignal;
}

const WEIGHTS: Record<TrustVelocitySignal, number> = {
  'rapid-build': 1,
  'steady-build': 0.8,
  'cautious': 0.55,
  'stalled': 0.25,
  'eroding': 0,
};

export type TrustVelocityBand =
  | 'eroding'
  | 'stalled'
  | 'building'
  | 'accelerating'
  | 'untested';

export interface TrustVelocityRow {
  topic: string;
  n: number;
  score: number;
  band: TrustVelocityBand;
}

function bandFor(n: number, score: number): TrustVelocityBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'eroding';
  if (score < 0.55) return 'stalled';
  if (score < 0.85) return 'building';
  return 'accelerating';
}

export function summarizeDtmTopicTrustVelocity(
  events: TrustVelocityEvent[],
): TrustVelocityRow[] {
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
  const out: TrustVelocityRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function erodingDtmTopics(rows: TrustVelocityRow[]): TrustVelocityRow[] {
  return rows.filter((r) => r.band === 'eroding');
}
