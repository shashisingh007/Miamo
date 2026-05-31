import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type OpeningQualitySignal =
  | 'opening-fully'
  | 'opening'
  | 'partial'
  | 'guarded'
  | 'closed';

export interface OpeningQualityEvent {
  topic: string;
  signal: OpeningQualitySignal;
}

const WEIGHTS: Record<OpeningQualitySignal, number> = {
  'opening-fully': 1,
  opening: 0.8,
  partial: 0.55,
  guarded: 0.25,
  closed: 0,
};

export type OpeningQualityBand = 'closed' | 'guarded' | 'partial' | 'open' | 'untested';

export interface OpeningQualityRow {
  topic: string;
  n: number;
  score: number;
  band: OpeningQualityBand;
}

function bandFor(n: number, score: number): OpeningQualityBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'closed';
  if (score < 0.55) return 'guarded';
  if (score < 0.85) return 'partial';
  return 'open';
}

export function summarizeDtmTopicOpeningQuality(events: OpeningQualityEvent[]): OpeningQualityRow[] {
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
  const out: OpeningQualityRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function closedDtmTopics(rows: OpeningQualityRow[]): OpeningQualityRow[] {
  return rows.filter((r) => r.band === 'closed' || r.band === 'guarded');
}
