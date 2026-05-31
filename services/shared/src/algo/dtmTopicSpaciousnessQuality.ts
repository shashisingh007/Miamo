import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type SpaciousnessQualitySignal =
  | 'expansive'
  | 'roomy'
  | 'snug'
  | 'cramped'
  | 'suffocating';

export interface SpaciousnessQualityEvent {
  topic: string;
  signal: SpaciousnessQualitySignal;
}

const WEIGHTS: Record<SpaciousnessQualitySignal, number> = {
  expansive: 1,
  roomy: 0.8,
  snug: 0.55,
  cramped: 0.25,
  suffocating: 0,
};

export type SpaciousnessQualityBand =
  | 'suffocating'
  | 'cramped'
  | 'snug'
  | 'roomy'
  | 'untested';

export interface SpaciousnessQualityRow {
  topic: string;
  n: number;
  score: number;
  band: SpaciousnessQualityBand;
}

function bandFor(n: number, score: number): SpaciousnessQualityBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'suffocating';
  if (score < 0.55) return 'cramped';
  if (score < 0.85) return 'snug';
  return 'roomy';
}

export function summarizeDtmTopicSpaciousnessQuality(events: SpaciousnessQualityEvent[]): SpaciousnessQualityRow[] {
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
  const out: SpaciousnessQualityRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function suffocatingDtmTopics(rows: SpaciousnessQualityRow[]): SpaciousnessQualityRow[] {
  return rows.filter((r) => r.band === 'suffocating' || r.band === 'cramped');
}
