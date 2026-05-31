import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type VitalitySignal = 'vibrant' | 'energized' | 'mixed' | 'tired' | 'depleted';

export interface VitalityEvent {
  topic: string;
  signal: VitalitySignal;
}

const WEIGHTS: Record<VitalitySignal, number> = {
  vibrant: 1,
  energized: 0.8,
  mixed: 0.55,
  tired: 0.25,
  depleted: 0,
};

export type VitalityBand = 'depleted' | 'tired' | 'mixed' | 'energized' | 'untested';

export interface VitalityRow {
  topic: string;
  n: number;
  score: number;
  band: VitalityBand;
}

function bandFor(n: number, score: number): VitalityBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'depleted';
  if (score < 0.55) return 'tired';
  if (score < 0.85) return 'mixed';
  return 'energized';
}

export function summarizeDtmTopicVitalityQuality(events: VitalityEvent[]): VitalityRow[] {
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
  const out: VitalityRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function depletedDtmTopics(rows: VitalityRow[]): VitalityRow[] {
  return rows.filter((r) => r.band === 'depleted' || r.band === 'tired');
}
