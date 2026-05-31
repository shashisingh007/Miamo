import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type AdaptabilityWeightSignal = 'flexible' | 'adaptive' | 'mixed' | 'rigid' | 'inflexible';

export interface AdaptabilityWeightEvent {
  topic: string;
  signal: AdaptabilityWeightSignal;
}

const WEIGHTS: Record<AdaptabilityWeightSignal, number> = {
  flexible: 1,
  adaptive: 0.8,
  mixed: 0.55,
  rigid: 0.25,
  inflexible: 0,
};

export type AdaptabilityWeightBand = 'inflexible' | 'rigid' | 'mixed' | 'flexible' | 'untested';

export interface AdaptabilityWeightRow {
  topic: string;
  n: number;
  score: number;
  band: AdaptabilityWeightBand;
}

function bandFor(n: number, score: number): AdaptabilityWeightBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'inflexible';
  if (score < 0.55) return 'rigid';
  if (score < 0.85) return 'mixed';
  return 'flexible';
}

export function summarizeDtmTopicAdaptabilityWeight(events: AdaptabilityWeightEvent[]): AdaptabilityWeightRow[] {
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
  const out: AdaptabilityWeightRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function inflexibleDtmTopics(rows: AdaptabilityWeightRow[]): AdaptabilityWeightRow[] {
  return rows.filter((r) => r.band === 'inflexible' || r.band === 'rigid');
}
