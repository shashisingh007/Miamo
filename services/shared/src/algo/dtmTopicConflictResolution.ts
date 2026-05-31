import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type ConflictResolutionSignal =
  | 'integrative-solution'
  | 'compromise'
  | 'one-yields'
  | 'avoid'
  | 'unresolved-escalation';

export interface ConflictResolutionEvent {
  topic: string;
  signal: ConflictResolutionSignal;
}

const WEIGHTS: Record<ConflictResolutionSignal, number> = {
  'integrative-solution': 1,
  'compromise': 0.75,
  'one-yields': 0.5,
  'avoid': 0.25,
  'unresolved-escalation': 0,
};

export type ConflictResolutionBand = 'escalating' | 'avoidant' | 'resolving' | 'integrating' | 'untested';

export interface ConflictResolutionRow {
  topic: string;
  n: number;
  score: number;
  band: ConflictResolutionBand;
}

function bandFor(n: number, score: number): ConflictResolutionBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'escalating';
  if (score < 0.55) return 'avoidant';
  if (score < 0.85) return 'resolving';
  return 'integrating';
}

export function summarizeDtmTopicConflictResolution(events: ConflictResolutionEvent[]): ConflictResolutionRow[] {
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
  const out: ConflictResolutionRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function escalatingDtmTopics(rows: ConflictResolutionRow[]): ConflictResolutionRow[] {
  return rows.filter((r) => r.band === 'escalating');
}
