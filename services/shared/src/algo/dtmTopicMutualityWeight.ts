import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type MutualityWeightSignal =
  | 'reciprocal'
  | 'balanced'
  | 'mixed'
  | 'tilted'
  | 'onesided';

export interface MutualityWeightEvent {
  topic: string;
  signal: MutualityWeightSignal;
}

const WEIGHTS: Record<MutualityWeightSignal, number> = {
  reciprocal: 1,
  balanced: 0.8,
  mixed: 0.55,
  tilted: 0.25,
  onesided: 0,
};

export type MutualityWeightBand = 'onesided' | 'tilted' | 'mixed' | 'balanced' | 'untested';

export interface MutualityWeightRow {
  topic: string;
  n: number;
  score: number;
  band: MutualityWeightBand;
}

function bandFor(n: number, score: number): MutualityWeightBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'onesided';
  if (score < 0.55) return 'tilted';
  if (score < 0.85) return 'mixed';
  return 'balanced';
}

export function summarizeDtmTopicMutualityWeight(
  events: MutualityWeightEvent[]
): MutualityWeightRow[] {
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
  const out: MutualityWeightRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function onesidedDtmTopics(rows: MutualityWeightRow[]): MutualityWeightRow[] {
  return rows.filter((r) => r.band === 'onesided' || r.band === 'tilted');
}
