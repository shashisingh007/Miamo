import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type SpontaneityIndexSignal =
  | 'spontaneous-act'
  | 'flexible'
  | 'planned'
  | 'rigid'
  | 'stalled';

export interface SpontaneityIndexEvent {
  topic: string;
  signal: SpontaneityIndexSignal;
}

const WEIGHTS: Record<SpontaneityIndexSignal, number> = {
  'spontaneous-act': 1,
  'flexible': 0.8,
  'planned': 0.55,
  'rigid': 0.25,
  'stalled': 0,
};

export type SpontaneityIndexBand =
  | 'stalled'
  | 'rigid'
  | 'planned'
  | 'spontaneous'
  | 'untested';

export interface SpontaneityIndexRow {
  topic: string;
  n: number;
  score: number;
  band: SpontaneityIndexBand;
}

function bandFor(n: number, score: number): SpontaneityIndexBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'stalled';
  if (score < 0.55) return 'rigid';
  if (score < 0.85) return 'planned';
  return 'spontaneous';
}

export function summarizeDtmTopicSpontaneityIndex(
  events: SpontaneityIndexEvent[],
): SpontaneityIndexRow[] {
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
  const out: SpontaneityIndexRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function stalledDtmTopics(rows: SpontaneityIndexRow[]): SpontaneityIndexRow[] {
  return rows.filter((r) => r.band === 'stalled');
}
