import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type CourageousnessSignal = 'bold' | 'steady' | 'mixed' | 'hesitant' | 'timid';

export interface CourageousnessEvent {
  topic: string;
  signal: CourageousnessSignal;
}

const WEIGHTS: Record<CourageousnessSignal, number> = {
  bold: 1,
  steady: 0.8,
  mixed: 0.55,
  hesitant: 0.25,
  timid: 0,
};

export type CourageousnessBand = 'timid' | 'hesitant' | 'mixed' | 'bold' | 'untested';

export interface CourageousnessRow {
  topic: string;
  n: number;
  score: number;
  band: CourageousnessBand;
}

function bandFor(n: number, score: number): CourageousnessBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'timid';
  if (score < 0.55) return 'hesitant';
  if (score < 0.85) return 'mixed';
  return 'bold';
}

export function summarizeDtmTopicCourageousness(events: CourageousnessEvent[]): CourageousnessRow[] {
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
  const out: CourageousnessRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function timidDtmTopics(rows: CourageousnessRow[]): CourageousnessRow[] {
  return rows.filter((r) => r.band === 'timid' || r.band === 'hesitant');
}
