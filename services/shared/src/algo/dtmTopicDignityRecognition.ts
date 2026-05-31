import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type DignityRecognitionSignal =
  | 'honoring'
  | 'respecting'
  | 'acknowledging'
  | 'dismissing'
  | 'degrading';

export interface DignityRecognitionEvent {
  topic: string;
  signal: DignityRecognitionSignal;
}

const WEIGHTS: Record<DignityRecognitionSignal, number> = {
  honoring: 1,
  respecting: 0.8,
  acknowledging: 0.55,
  dismissing: 0.25,
  degrading: 0,
};

export type DignityRecognitionBand =
  | 'degrading'
  | 'dismissing'
  | 'acknowledging'
  | 'honoring'
  | 'untested';

export interface DignityRecognitionRow {
  topic: string;
  n: number;
  score: number;
  band: DignityRecognitionBand;
}

function bandFor(n: number, score: number): DignityRecognitionBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'degrading';
  if (score < 0.55) return 'dismissing';
  if (score < 0.85) return 'acknowledging';
  return 'honoring';
}

export function summarizeDtmTopicDignityRecognition(events: DignityRecognitionEvent[]): DignityRecognitionRow[] {
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
  const out: DignityRecognitionRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function degradedDtmTopics(rows: DignityRecognitionRow[]): DignityRecognitionRow[] {
  return rows.filter((r) => r.band === 'degrading' || r.band === 'dismissing');
}
