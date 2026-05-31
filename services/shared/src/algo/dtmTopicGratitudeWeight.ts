import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type GratitudeWeightSignal =
  | 'profound'
  | 'grateful'
  | 'mixed'
  | 'sparing'
  | 'absent';

export interface GratitudeWeightEvent {
  topic: string;
  signal: GratitudeWeightSignal;
}

const WEIGHTS: Record<GratitudeWeightSignal, number> = {
  profound: 1,
  grateful: 0.8,
  mixed: 0.55,
  sparing: 0.25,
  absent: 0,
};

export type GratitudeWeightBand =
  | 'absent'
  | 'sparing'
  | 'mixed'
  | 'grateful'
  | 'untested';

export interface GratitudeWeightRow {
  topic: string;
  n: number;
  score: number;
  band: GratitudeWeightBand;
}

function bandFor(n: number, score: number): GratitudeWeightBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'absent';
  if (score < 0.55) return 'sparing';
  if (score < 0.85) return 'mixed';
  return 'grateful';
}

export function summarizeDtmTopicGratitudeWeight(
  events: GratitudeWeightEvent[]
): GratitudeWeightRow[] {
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
  const out: GratitudeWeightRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function ungratefulDtmTopics(rows: GratitudeWeightRow[]): GratitudeWeightRow[] {
  return rows.filter((r) => r.band === 'absent' || r.band === 'sparing');
}
