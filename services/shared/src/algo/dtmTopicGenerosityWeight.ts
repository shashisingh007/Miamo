import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type GenerosityWeightSignal =
  | 'lavish'
  | 'generous'
  | 'mixed'
  | 'sparing'
  | 'withholding';

export interface GenerosityWeightEvent {
  topic: string;
  signal: GenerosityWeightSignal;
}

const WEIGHTS: Record<GenerosityWeightSignal, number> = {
  lavish: 1,
  generous: 0.8,
  mixed: 0.55,
  sparing: 0.25,
  withholding: 0,
};

export type GenerosityWeightBand =
  | 'withholding'
  | 'sparing'
  | 'mixed'
  | 'generous'
  | 'untested';

export interface GenerosityWeightRow {
  topic: string;
  n: number;
  score: number;
  band: GenerosityWeightBand;
}

function bandFor(n: number, score: number): GenerosityWeightBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'withholding';
  if (score < 0.55) return 'sparing';
  if (score < 0.85) return 'mixed';
  return 'generous';
}

export function summarizeDtmTopicGenerosityWeight(
  events: GenerosityWeightEvent[]
): GenerosityWeightRow[] {
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
  const out: GenerosityWeightRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function withholdingDtmTopics(rows: GenerosityWeightRow[]): GenerosityWeightRow[] {
  return rows.filter((r) => r.band === 'withholding' || r.band === 'sparing');
}
