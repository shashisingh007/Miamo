import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type EmotionalRegulationSignal =
  | 'regulated'
  | 'composed'
  | 'wobbly'
  | 'reactive'
  | 'flooded';

export interface EmotionalRegulationEvent {
  topic: string;
  signal: EmotionalRegulationSignal;
}

const WEIGHTS: Record<EmotionalRegulationSignal, number> = {
  regulated: 1,
  composed: 0.8,
  wobbly: 0.55,
  reactive: 0.25,
  flooded: 0,
};

export type EmotionalRegulationBand =
  | 'flooded'
  | 'reactive'
  | 'wobbly'
  | 'regulated'
  | 'untested';

export interface EmotionalRegulationRow {
  topic: string;
  n: number;
  score: number;
  band: EmotionalRegulationBand;
}

function bandFor(n: number, score: number): EmotionalRegulationBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'flooded';
  if (score < 0.55) return 'reactive';
  if (score < 0.85) return 'wobbly';
  return 'regulated';
}

export function summarizeDtmTopicEmotionalRegulation(events: EmotionalRegulationEvent[]): EmotionalRegulationRow[] {
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
  const out: EmotionalRegulationRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function floodedDtmTopics(rows: EmotionalRegulationRow[]): EmotionalRegulationRow[] {
  return rows.filter((r) => r.band === 'flooded' || r.band === 'reactive');
}
