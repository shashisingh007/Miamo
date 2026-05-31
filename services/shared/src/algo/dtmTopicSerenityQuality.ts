import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type SereneSignal = 'serene' | 'calm' | 'mixed' | 'unsettled' | 'turbulent';

export interface SerenityEvent {
  topic: string;
  signal: SereneSignal;
}

const WEIGHTS: Record<SereneSignal, number> = {
  serene: 1,
  calm: 0.8,
  mixed: 0.55,
  unsettled: 0.25,
  turbulent: 0,
};

export type SerenityBand = 'turbulent' | 'unsettled' | 'mixed' | 'calm' | 'untested';

export interface SerenityRow {
  topic: string;
  n: number;
  score: number;
  band: SerenityBand;
}

function bandFor(n: number, score: number): SerenityBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'turbulent';
  if (score < 0.55) return 'unsettled';
  if (score < 0.85) return 'mixed';
  return 'calm';
}

export function summarizeDtmTopicSerenityQuality(events: SerenityEvent[]): SerenityRow[] {
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
  const out: SerenityRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function turbulentDtmTopics(rows: SerenityRow[]): SerenityRow[] {
  return rows.filter((r) => r.band === 'turbulent' || r.band === 'unsettled');
}
