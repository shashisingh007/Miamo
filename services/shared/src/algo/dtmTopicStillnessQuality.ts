import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type StillnessSignal = 'stilled' | 'settled' | 'mixed' | 'restless' | 'agitated';

export interface StillnessEvent {
  topic: string;
  signal: StillnessSignal;
}

const WEIGHTS: Record<StillnessSignal, number> = {
  stilled: 1,
  settled: 0.8,
  mixed: 0.55,
  restless: 0.25,
  agitated: 0,
};

export type StillnessBand = 'agitated' | 'restless' | 'mixed' | 'settled' | 'untested';

export interface StillnessRow {
  topic: string;
  n: number;
  score: number;
  band: StillnessBand;
}

function bandFor(n: number, score: number): StillnessBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'agitated';
  if (score < 0.55) return 'restless';
  if (score < 0.85) return 'mixed';
  return 'settled';
}

export function summarizeDtmTopicStillnessQuality(events: StillnessEvent[]): StillnessRow[] {
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
  const out: StillnessRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function agitatedDtmTopics(rows: StillnessRow[]): StillnessRow[] {
  return rows.filter((r) => r.band === 'agitated' || r.band === 'restless');
}
