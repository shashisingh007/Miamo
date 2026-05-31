import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type RoutineSyncSignal =
  | 'in-sync'
  | 'mostly-sync'
  | 'occasional-sync'
  | 'misaligned'
  | 'desynced';

export interface RoutineSyncEvent {
  topic: string;
  signal: RoutineSyncSignal;
}

const WEIGHTS: Record<RoutineSyncSignal, number> = {
  'in-sync': 1,
  'mostly-sync': 0.8,
  'occasional-sync': 0.55,
  'misaligned': 0.25,
  'desynced': 0,
};

export type RoutineSyncBand = 'desynced' | 'misaligned' | 'partial' | 'synced' | 'untested';

export interface RoutineSyncRow {
  topic: string;
  n: number;
  score: number;
  band: RoutineSyncBand;
}

function bandFor(n: number, score: number): RoutineSyncBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'desynced';
  if (score < 0.55) return 'misaligned';
  if (score < 0.85) return 'partial';
  return 'synced';
}

export function summarizeDtmTopicRoutineSync(events: RoutineSyncEvent[]): RoutineSyncRow[] {
  const acc = new Map<string, { sum: number; n: number }>();
  for (const t of DTM_TOPIC_KEYS) acc.set(t, { sum: 0, n: 0 });
  for (const e of events) {
    if (!INDEX.has(e.topic)) continue;
    const w = WEIGHTS[e.signal];
    if (w === undefined) continue;
    const cell = acc.get(e.topic)!;
    cell.sum += w;
    cell.n += 1;
  }
  const out: RoutineSyncRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function desyncedDtmTopics(rows: RoutineSyncRow[]): RoutineSyncRow[] {
  return rows.filter((r) => r.band === 'desynced');
}
