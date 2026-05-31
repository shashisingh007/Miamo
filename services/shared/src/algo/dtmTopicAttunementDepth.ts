import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type AttunementDepthSignal =
  | 'deep'
  | 'attuned'
  | 'partial'
  | 'shallow'
  | 'absent';

export interface AttunementDepthEvent {
  topic: string;
  signal: AttunementDepthSignal;
}

const WEIGHTS: Record<AttunementDepthSignal, number> = {
  deep: 1,
  attuned: 0.8,
  partial: 0.55,
  shallow: 0.25,
  absent: 0,
};

export type AttunementDepthBand =
  | 'absent'
  | 'shallow'
  | 'partial'
  | 'attuned'
  | 'untested';

export interface AttunementDepthRow {
  topic: string;
  n: number;
  score: number;
  band: AttunementDepthBand;
}

function bandFor(n: number, score: number): AttunementDepthBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'absent';
  if (score < 0.55) return 'shallow';
  if (score < 0.85) return 'partial';
  return 'attuned';
}

export function summarizeDtmTopicAttunementDepth(events: AttunementDepthEvent[]): AttunementDepthRow[] {
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
  const out: AttunementDepthRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function shallowAttunementDtmTopics(rows: AttunementDepthRow[]): AttunementDepthRow[] {
  return rows.filter((r) => r.band === 'absent' || r.band === 'shallow');
}
