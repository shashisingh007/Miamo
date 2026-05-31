import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type MeaningMakingSignal =
  | 'integrative'
  | 'reflective'
  | 'descriptive'
  | 'fragmentary'
  | 'incoherent';

export interface MeaningMakingEvent {
  topic: string;
  signal: MeaningMakingSignal;
}

const WEIGHTS: Record<MeaningMakingSignal, number> = {
  integrative: 1,
  reflective: 0.8,
  descriptive: 0.55,
  fragmentary: 0.25,
  incoherent: 0,
};

export type MeaningMakingBand =
  | 'incoherent'
  | 'fragmentary'
  | 'descriptive'
  | 'reflective'
  | 'untested';

export interface MeaningMakingRow {
  topic: string;
  n: number;
  score: number;
  band: MeaningMakingBand;
}

function bandFor(n: number, score: number): MeaningMakingBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'incoherent';
  if (score < 0.55) return 'fragmentary';
  if (score < 0.85) return 'descriptive';
  return 'reflective';
}

export function summarizeDtmTopicMeaningMakingDepth(events: MeaningMakingEvent[]): MeaningMakingRow[] {
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
  const out: MeaningMakingRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function fragmentedMeaningDtmTopics(rows: MeaningMakingRow[]): MeaningMakingRow[] {
  return rows.filter((r) => r.band === 'incoherent' || r.band === 'fragmentary');
}
