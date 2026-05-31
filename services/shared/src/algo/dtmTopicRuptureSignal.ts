import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type RuptureSignal =
  | 'no-rupture'
  | 'brief-strain'
  | 'noticed-rupture'
  | 'sustained-rupture'
  | 'cascading-rupture';

export interface RuptureEvent {
  topic: string;
  signal: RuptureSignal;
}

const WEIGHTS: Record<RuptureSignal, number> = {
  'no-rupture': 1,
  'brief-strain': 0.8,
  'noticed-rupture': 0.55,
  'sustained-rupture': 0.25,
  'cascading-rupture': 0,
};

export type RuptureBand =
  | 'cascading'
  | 'sustained'
  | 'noticed'
  | 'intact'
  | 'untested';

export interface RuptureRow {
  topic: string;
  n: number;
  score: number;
  band: RuptureBand;
}

function bandFor(n: number, score: number): RuptureBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'cascading';
  if (score < 0.55) return 'sustained';
  if (score < 0.85) return 'noticed';
  return 'intact';
}

export function summarizeDtmTopicRuptureSignal(events: RuptureEvent[]): RuptureRow[] {
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
  const out: RuptureRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function cascadingDtmTopics(rows: RuptureRow[]): RuptureRow[] {
  return rows.filter((r) => r.band === 'cascading');
}
