import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type AspirationSignal = 'reaching' | 'leaning' | 'mixed' | 'drifting' | 'stalled';

export interface AspirationEvent {
  topic: string;
  signal: AspirationSignal;
}

const WEIGHTS: Record<AspirationSignal, number> = {
  reaching: 1,
  leaning: 0.8,
  mixed: 0.55,
  drifting: 0.25,
  stalled: 0,
};

export type AspirationBand = 'stalled' | 'drifting' | 'mixed' | 'leaning' | 'untested';

export interface AspirationRow {
  topic: string;
  n: number;
  score: number;
  band: AspirationBand;
}

function bandFor(n: number, score: number): AspirationBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'stalled';
  if (score < 0.55) return 'drifting';
  if (score < 0.85) return 'mixed';
  return 'leaning';
}

export function summarizeDtmTopicAspirationFlow(events: AspirationEvent[]): AspirationRow[] {
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
  const out: AspirationRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function stalledDtmTopics(rows: AspirationRow[]): AspirationRow[] {
  return rows.filter((r) => r.band === 'stalled' || r.band === 'drifting');
}
