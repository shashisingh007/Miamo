import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type TrustWeightSignal = 'trusting' | 'confiding' | 'mixed' | 'wary' | 'distrustful';

export interface TrustWeightEvent {
  topic: string;
  signal: TrustWeightSignal;
}

const WEIGHTS: Record<TrustWeightSignal, number> = {
  trusting: 1,
  confiding: 0.8,
  mixed: 0.55,
  wary: 0.25,
  distrustful: 0,
};

export type TrustWeightBand = 'distrustful' | 'wary' | 'mixed' | 'trusting' | 'untested';

export interface TrustWeightRow {
  topic: string;
  n: number;
  score: number;
  band: TrustWeightBand;
}

function bandFor(n: number, score: number): TrustWeightBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'distrustful';
  if (score < 0.55) return 'wary';
  if (score < 0.85) return 'mixed';
  return 'trusting';
}

export function summarizeDtmTopicTrustWeight(events: TrustWeightEvent[]): TrustWeightRow[] {
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
  const out: TrustWeightRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function distrustfulDtmTopics(rows: TrustWeightRow[]): TrustWeightRow[] {
  return rows.filter((r) => r.band === 'distrustful' || r.band === 'wary');
}
