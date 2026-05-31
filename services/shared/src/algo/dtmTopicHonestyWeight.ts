import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type HonestyWeightSignal = 'honest' | 'candid' | 'mixed' | 'evasive' | 'dishonest';

export interface HonestyWeightEvent {
  topic: string;
  signal: HonestyWeightSignal;
}

const WEIGHTS: Record<HonestyWeightSignal, number> = {
  honest: 1,
  candid: 0.8,
  mixed: 0.55,
  evasive: 0.25,
  dishonest: 0,
};

export type HonestyWeightBand = 'dishonest' | 'evasive' | 'mixed' | 'honest' | 'untested';

export interface HonestyWeightRow {
  topic: string;
  n: number;
  score: number;
  band: HonestyWeightBand;
}

function bandFor(n: number, score: number): HonestyWeightBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'dishonest';
  if (score < 0.55) return 'evasive';
  if (score < 0.85) return 'mixed';
  return 'honest';
}

export function summarizeDtmTopicHonestyWeight(events: HonestyWeightEvent[]): HonestyWeightRow[] {
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
  const out: HonestyWeightRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function dishonestDtmTopics(rows: HonestyWeightRow[]): HonestyWeightRow[] {
  return rows.filter((r) => r.band === 'dishonest' || r.band === 'evasive');
}
