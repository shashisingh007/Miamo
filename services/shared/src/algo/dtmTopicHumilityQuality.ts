import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type HumilityQualitySignal = 'humble' | 'modest' | 'mixed' | 'proud' | 'arrogant';

export interface HumilityQualityEvent {
  topic: string;
  signal: HumilityQualitySignal;
}

const WEIGHTS: Record<HumilityQualitySignal, number> = {
  humble: 1,
  modest: 0.8,
  mixed: 0.55,
  proud: 0.25,
  arrogant: 0,
};

export type HumilityQualityBand = 'arrogant' | 'proud' | 'mixed' | 'humble' | 'untested';

export interface HumilityQualityRow {
  topic: string;
  n: number;
  score: number;
  band: HumilityQualityBand;
}

function bandFor(n: number, score: number): HumilityQualityBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'arrogant';
  if (score < 0.55) return 'proud';
  if (score < 0.85) return 'mixed';
  return 'humble';
}

export function summarizeDtmTopicHumilityQuality(events: HumilityQualityEvent[]): HumilityQualityRow[] {
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
  const out: HumilityQualityRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function arrogantDtmTopics(rows: HumilityQualityRow[]): HumilityQualityRow[] {
  return rows.filter((r) => r.band === 'arrogant' || r.band === 'proud');
}
