import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type LoyaltyWeightSignal = 'loyal' | 'devoted' | 'mixed' | 'wavering' | 'disloyal';

export interface LoyaltyWeightEvent {
  topic: string;
  signal: LoyaltyWeightSignal;
}

const WEIGHTS: Record<LoyaltyWeightSignal, number> = {
  loyal: 1,
  devoted: 0.8,
  mixed: 0.55,
  wavering: 0.25,
  disloyal: 0,
};

export type LoyaltyWeightBand = 'disloyal' | 'wavering' | 'mixed' | 'loyal' | 'untested';

export interface LoyaltyWeightRow {
  topic: string;
  n: number;
  score: number;
  band: LoyaltyWeightBand;
}

function bandFor(n: number, score: number): LoyaltyWeightBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'disloyal';
  if (score < 0.55) return 'wavering';
  if (score < 0.85) return 'mixed';
  return 'loyal';
}

export function summarizeDtmTopicLoyaltyWeight(events: LoyaltyWeightEvent[]): LoyaltyWeightRow[] {
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
  const out: LoyaltyWeightRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function disloyalDtmTopics(rows: LoyaltyWeightRow[]): LoyaltyWeightRow[] {
  return rows.filter((r) => r.band === 'disloyal' || r.band === 'wavering');
}
