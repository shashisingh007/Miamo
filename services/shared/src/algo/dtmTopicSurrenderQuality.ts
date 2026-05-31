import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type SurrenderQualitySignal =
  | 'yielding'
  | 'releasing'
  | 'softening'
  | 'gripping'
  | 'clenching';

export interface SurrenderQualityEvent {
  topic: string;
  signal: SurrenderQualitySignal;
}

const WEIGHTS: Record<SurrenderQualitySignal, number> = {
  yielding: 1,
  releasing: 0.8,
  softening: 0.55,
  gripping: 0.25,
  clenching: 0,
};

export type SurrenderQualityBand =
  | 'clenching'
  | 'gripping'
  | 'softening'
  | 'yielding'
  | 'untested';

export interface SurrenderQualityRow {
  topic: string;
  n: number;
  score: number;
  band: SurrenderQualityBand;
}

function bandFor(n: number, score: number): SurrenderQualityBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'clenching';
  if (score < 0.55) return 'gripping';
  if (score < 0.85) return 'softening';
  return 'yielding';
}

export function summarizeDtmTopicSurrenderQuality(events: SurrenderQualityEvent[]): SurrenderQualityRow[] {
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
  const out: SurrenderQualityRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function clenchedDtmTopics(rows: SurrenderQualityRow[]): SurrenderQualityRow[] {
  return rows.filter((r) => r.band === 'clenching' || r.band === 'gripping');
}
