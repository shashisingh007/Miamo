import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type EquanimitySignal = 'centered' | 'steady' | 'mixed' | 'reactive' | 'overwhelmed';

export interface EquanimityEvent {
  topic: string;
  signal: EquanimitySignal;
}

const WEIGHTS: Record<EquanimitySignal, number> = {
  centered: 1,
  steady: 0.8,
  mixed: 0.55,
  reactive: 0.25,
  overwhelmed: 0,
};

export type EquanimityBand = 'overwhelmed' | 'reactive' | 'mixed' | 'steady' | 'untested';

export interface EquanimityRow {
  topic: string;
  n: number;
  score: number;
  band: EquanimityBand;
}

function bandFor(n: number, score: number): EquanimityBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'overwhelmed';
  if (score < 0.55) return 'reactive';
  if (score < 0.85) return 'mixed';
  return 'steady';
}

export function summarizeDtmTopicEquanimityQuality(events: EquanimityEvent[]): EquanimityRow[] {
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
  const out: EquanimityRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function overwhelmedDtmTopics(rows: EquanimityRow[]): EquanimityRow[] {
  return rows.filter((r) => r.band === 'overwhelmed' || r.band === 'reactive');
}
