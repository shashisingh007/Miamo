import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type RecognitionSignal =
  | 'deeply-recognized'
  | 'recognized'
  | 'partially-recognized'
  | 'misrecognized'
  | 'unrecognized';

export interface RecognitionEvent {
  topic: string;
  signal: RecognitionSignal;
}

const WEIGHTS: Record<RecognitionSignal, number> = {
  'deeply-recognized': 1,
  recognized: 0.8,
  'partially-recognized': 0.55,
  misrecognized: 0.25,
  unrecognized: 0,
};

export type RecognitionBand =
  | 'unrecognized'
  | 'misrecognized'
  | 'partial'
  | 'recognized'
  | 'untested';

export interface RecognitionRow {
  topic: string;
  n: number;
  score: number;
  band: RecognitionBand;
}

function bandFor(n: number, score: number): RecognitionBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'unrecognized';
  if (score < 0.55) return 'misrecognized';
  if (score < 0.85) return 'partial';
  return 'recognized';
}

export function summarizeDtmTopicRecognitionDepth(events: RecognitionEvent[]): RecognitionRow[] {
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
  const out: RecognitionRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function unrecognizedDtmTopics(rows: RecognitionRow[]): RecognitionRow[] {
  return rows.filter((r) => r.band === 'unrecognized' || r.band === 'misrecognized');
}
