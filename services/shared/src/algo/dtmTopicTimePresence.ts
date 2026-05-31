import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type TimePresenceSignal =
  | 'fully-present'
  | 'mostly-present'
  | 'partially-present'
  | 'distracted'
  | 'absent';

export interface TimePresenceEvent {
  topic: string;
  signal: TimePresenceSignal;
}

const WEIGHTS: Record<TimePresenceSignal, number> = {
  'fully-present': 1,
  'mostly-present': 0.8,
  'partially-present': 0.55,
  'distracted': 0.25,
  'absent': 0,
};

export type TimePresenceBand = 'absent' | 'distracted' | 'partial' | 'present' | 'untested';

export interface TimePresenceRow {
  topic: string;
  n: number;
  score: number;
  band: TimePresenceBand;
}

function bandFor(n: number, score: number): TimePresenceBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'absent';
  if (score < 0.55) return 'distracted';
  if (score < 0.85) return 'partial';
  return 'present';
}

export function summarizeDtmTopicTimePresence(events: TimePresenceEvent[]): TimePresenceRow[] {
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
  const out: TimePresenceRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function absentDtmTopics(rows: TimePresenceRow[]): TimePresenceRow[] {
  return rows.filter((r) => r.band === 'absent');
}
