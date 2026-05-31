import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type CherishingSignal =
  | 'cherishing'
  | 'valuing'
  | 'tolerating'
  | 'overlooking'
  | 'diminishing';

export interface CherishingEvent {
  topic: string;
  signal: CherishingSignal;
}

const WEIGHTS: Record<CherishingSignal, number> = {
  cherishing: 1,
  valuing: 0.8,
  tolerating: 0.55,
  overlooking: 0.25,
  diminishing: 0,
};

export type CherishingBand =
  | 'diminishing'
  | 'overlooking'
  | 'tolerating'
  | 'valuing'
  | 'untested';

export interface CherishingRow {
  topic: string;
  n: number;
  score: number;
  band: CherishingBand;
}

function bandFor(n: number, score: number): CherishingBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'diminishing';
  if (score < 0.55) return 'overlooking';
  if (score < 0.85) return 'tolerating';
  return 'valuing';
}

export function summarizeDtmTopicCherishingExpression(events: CherishingEvent[]): CherishingRow[] {
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
  const out: CherishingRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function diminishingDtmTopics(rows: CherishingRow[]): CherishingRow[] {
  return rows.filter((r) => r.band === 'diminishing' || r.band === 'overlooking');
}
