import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type GroundednessQualitySignal =
  | 'rooted'
  | 'grounded'
  | 'settling'
  | 'unsteady'
  | 'unmoored';

export interface GroundednessQualityEvent {
  topic: string;
  signal: GroundednessQualitySignal;
}

const WEIGHTS: Record<GroundednessQualitySignal, number> = {
  rooted: 1,
  grounded: 0.8,
  settling: 0.55,
  unsteady: 0.25,
  unmoored: 0,
};

export type GroundednessQualityBand =
  | 'unmoored'
  | 'unsteady'
  | 'settling'
  | 'grounded'
  | 'untested';

export interface GroundednessQualityRow {
  topic: string;
  n: number;
  score: number;
  band: GroundednessQualityBand;
}

function bandFor(n: number, score: number): GroundednessQualityBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'unmoored';
  if (score < 0.55) return 'unsteady';
  if (score < 0.85) return 'settling';
  return 'grounded';
}

export function summarizeDtmTopicGroundednessQuality(events: GroundednessQualityEvent[]): GroundednessQualityRow[] {
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
  const out: GroundednessQualityRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function unmooredDtmTopics(rows: GroundednessQualityRow[]): GroundednessQualityRow[] {
  return rows.filter((r) => r.band === 'unmoored' || r.band === 'unsteady');
}
