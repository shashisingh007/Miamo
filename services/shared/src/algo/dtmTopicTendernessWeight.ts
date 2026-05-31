import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type TendernessWeightSignal =
  | 'cherishing'
  | 'tender'
  | 'mixed'
  | 'distant'
  | 'cold';

export interface TendernessWeightEvent {
  topic: string;
  signal: TendernessWeightSignal;
}

const WEIGHTS: Record<TendernessWeightSignal, number> = {
  cherishing: 1,
  tender: 0.8,
  mixed: 0.55,
  distant: 0.25,
  cold: 0,
};

export type TendernessWeightBand =
  | 'cold'
  | 'distant'
  | 'mixed'
  | 'tender'
  | 'untested';

export interface TendernessWeightRow {
  topic: string;
  n: number;
  score: number;
  band: TendernessWeightBand;
}

function bandFor(n: number, score: number): TendernessWeightBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'cold';
  if (score < 0.55) return 'distant';
  if (score < 0.85) return 'mixed';
  return 'tender';
}

export function summarizeDtmTopicTendernessWeight(
  events: TendernessWeightEvent[]
): TendernessWeightRow[] {
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
  const out: TendernessWeightRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function coldTendernessDtmTopics(rows: TendernessWeightRow[]): TendernessWeightRow[] {
  return rows.filter((r) => r.band === 'cold' || r.band === 'distant');
}
