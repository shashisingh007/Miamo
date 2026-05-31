import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type FondnessSignal =
  | 'cherished'
  | 'warm-fondness'
  | 'positive-recall'
  | 'neutral-recall'
  | 'bitter-recall';

export interface FondnessEvent {
  topic: string;
  signal: FondnessSignal;
}

const WEIGHTS: Record<FondnessSignal, number> = {
  'cherished': 1,
  'warm-fondness': 0.8,
  'positive-recall': 0.55,
  'neutral-recall': 0.25,
  'bitter-recall': 0,
};

export type FondnessBand =
  | 'bitter'
  | 'neutral'
  | 'fond'
  | 'cherished'
  | 'untested';

export interface FondnessRow {
  topic: string;
  n: number;
  score: number;
  band: FondnessBand;
}

function bandFor(n: number, score: number): FondnessBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'bitter';
  if (score < 0.55) return 'neutral';
  if (score < 0.85) return 'fond';
  return 'cherished';
}

export function summarizeDtmTopicFondnessAdmiration(events: FondnessEvent[]): FondnessRow[] {
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
  const out: FondnessRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function bitterDtmTopics(rows: FondnessRow[]): FondnessRow[] {
  return rows.filter((r) => r.band === 'bitter');
}
