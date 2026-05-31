import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type TrustQualitySignal = 'trustworthy' | 'reliable' | 'mixed' | 'unreliable' | 'untrustworthy';

export interface TrustQualityEvent {
  topic: string;
  signal: TrustQualitySignal;
}

const WEIGHTS: Record<TrustQualitySignal, number> = {
  trustworthy: 1,
  reliable: 0.8,
  mixed: 0.55,
  unreliable: 0.25,
  untrustworthy: 0,
};

export type TrustQualityBand = 'untrustworthy' | 'unreliable' | 'mixed' | 'trustworthy' | 'untested';

export interface TrustQualityRow {
  topic: string;
  n: number;
  score: number;
  band: TrustQualityBand;
}

function bandFor(n: number, score: number): TrustQualityBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'untrustworthy';
  if (score < 0.55) return 'unreliable';
  if (score < 0.85) return 'mixed';
  return 'trustworthy';
}

export function summarizeDtmTopicTrustQuality(events: TrustQualityEvent[]): TrustQualityRow[] {
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
  const out: TrustQualityRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function untrustworthyDtmTopics(rows: TrustQualityRow[]): TrustQualityRow[] {
  return rows.filter((r) => r.band === 'untrustworthy' || r.band === 'unreliable');
}
