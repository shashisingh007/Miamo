import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type CuriosityOpennessSignal =
  | 'wide_open'
  | 'curious'
  | 'inquiring'
  | 'guarded'
  | 'closed';

export interface CuriosityOpennessEvent {
  topic: string;
  signal: CuriosityOpennessSignal;
}

const WEIGHTS: Record<CuriosityOpennessSignal, number> = {
  wide_open: 1,
  curious: 0.8,
  inquiring: 0.55,
  guarded: 0.25,
  closed: 0,
};

export type CuriosityOpennessBand =
  | 'closed'
  | 'guarded'
  | 'inquiring'
  | 'curious'
  | 'untested';

export interface CuriosityOpennessRow {
  topic: string;
  n: number;
  score: number;
  band: CuriosityOpennessBand;
}

function bandFor(n: number, score: number): CuriosityOpennessBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'closed';
  if (score < 0.55) return 'guarded';
  if (score < 0.85) return 'inquiring';
  return 'curious';
}

export function summarizeDtmTopicCuriosityOpenness(events: CuriosityOpennessEvent[]): CuriosityOpennessRow[] {
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
  const out: CuriosityOpennessRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function closedDtmTopics(rows: CuriosityOpennessRow[]): CuriosityOpennessRow[] {
  return rows.filter((r) => r.band === 'closed' || r.band === 'guarded');
}
