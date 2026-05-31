import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type ListeningQualitySignal =
  | 'reflective'
  | 'engaged'
  | 'neutral'
  | 'half-listening'
  | 'interrupting';

export interface ListeningQualityEvent {
  topic: string;
  signal: ListeningQualitySignal;
}

const WEIGHTS: Record<ListeningQualitySignal, number> = {
  'reflective': 1,
  'engaged': 0.8,
  'neutral': 0.55,
  'half-listening': 0.25,
  'interrupting': 0,
};

export type ListeningQualityBand =
  | 'interrupting'
  | 'shallow'
  | 'engaged'
  | 'reflective'
  | 'untested';

export interface ListeningQualityRow {
  topic: string;
  n: number;
  score: number;
  band: ListeningQualityBand;
}

function bandFor(n: number, score: number): ListeningQualityBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'interrupting';
  if (score < 0.55) return 'shallow';
  if (score < 0.85) return 'engaged';
  return 'reflective';
}

export function summarizeDtmTopicListeningQuality(
  events: ListeningQualityEvent[],
): ListeningQualityRow[] {
  const acc = new Map<string, { sum: number; n: number }>();
  for (const t of DTM_TOPIC_KEYS) acc.set(t, { sum: 0, n: 0 });
  for (const e of events) {
    if (!INDEX.has(e.topic)) continue;
    const w = WEIGHTS[e.signal];
    if (w === undefined) continue;
    const cell = acc.get(e.topic)!;
    cell.sum += w;
    cell.n += 1;
  }
  const out: ListeningQualityRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function interruptingDtmTopics(
  rows: ListeningQualityRow[],
): ListeningQualityRow[] {
  return rows.filter((r) => r.band === 'interrupting');
}
