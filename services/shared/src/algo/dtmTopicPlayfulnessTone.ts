import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type PlayfulnessToneSignal = 'playful' | 'lighthearted' | 'mixed' | 'serious' | 'somber';

export interface PlayfulnessToneEvent {
  topic: string;
  signal: PlayfulnessToneSignal;
}

const WEIGHTS: Record<PlayfulnessToneSignal, number> = {
  playful: 1,
  lighthearted: 0.8,
  mixed: 0.55,
  serious: 0.25,
  somber: 0,
};

export type PlayfulnessToneBand = 'somber' | 'serious' | 'mixed' | 'playful' | 'untested';

export interface PlayfulnessToneRow {
  topic: string;
  n: number;
  score: number;
  band: PlayfulnessToneBand;
}

function bandFor(n: number, score: number): PlayfulnessToneBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'somber';
  if (score < 0.55) return 'serious';
  if (score < 0.85) return 'mixed';
  return 'playful';
}

export function summarizeDtmTopicPlayfulnessTone(
  events: PlayfulnessToneEvent[],
): PlayfulnessToneRow[] {
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
  const out: PlayfulnessToneRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function somberDtmTopics(rows: PlayfulnessToneRow[]): PlayfulnessToneRow[] {
  return rows.filter((r) => r.band === 'somber' || r.band === 'serious');
}
