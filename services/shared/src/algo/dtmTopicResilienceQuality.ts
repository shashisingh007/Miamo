import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type ResilienceQualitySignal = 'resilient' | 'sturdy' | 'mixed' | 'fragile' | 'brittle';

export interface ResilienceQualityEvent {
  topic: string;
  signal: ResilienceQualitySignal;
}

const WEIGHTS: Record<ResilienceQualitySignal, number> = {
  resilient: 1,
  sturdy: 0.8,
  mixed: 0.55,
  fragile: 0.25,
  brittle: 0,
};

export type ResilienceQualityBand = 'brittle' | 'fragile' | 'mixed' | 'resilient' | 'untested';

export interface ResilienceQualityRow {
  topic: string;
  n: number;
  score: number;
  band: ResilienceQualityBand;
}

function bandFor(n: number, score: number): ResilienceQualityBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'brittle';
  if (score < 0.55) return 'fragile';
  if (score < 0.85) return 'mixed';
  return 'resilient';
}

export function summarizeDtmTopicResilienceQuality(
  events: ResilienceQualityEvent[],
): ResilienceQualityRow[] {
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
  const out: ResilienceQualityRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function brittleDtmTopics(rows: ResilienceQualityRow[]): ResilienceQualityRow[] {
  return rows.filter((r) => r.band === 'brittle' || r.band === 'fragile');
}
