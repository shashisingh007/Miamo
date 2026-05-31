import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type ForgivenessSignal =
  | 'genuine-repair'
  | 'apology-accepted'
  | 'apology-offered'
  | 'still-resentful'
  | 'grudge-held';

export interface ForgivenessEvent {
  topic: string;
  signal: ForgivenessSignal;
}

const WEIGHTS: Record<ForgivenessSignal, number> = {
  'genuine-repair': 1,
  'apology-accepted': 0.8,
  'apology-offered': 0.55,
  'still-resentful': 0.2,
  'grudge-held': 0,
};

export type ForgivenessBand = 'grudge' | 'lingering' | 'mending' | 'repaired' | 'untested';

export interface ForgivenessRow {
  topic: string;
  n: number;
  score: number;
  band: ForgivenessBand;
}

function bandFor(n: number, score: number): ForgivenessBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'grudge';
  if (score < 0.55) return 'lingering';
  if (score < 0.8) return 'mending';
  return 'repaired';
}

export function summarizeDtmTopicForgivenessCycle(events: ForgivenessEvent[]): ForgivenessRow[] {
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
  const out: ForgivenessRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function grudgeDtmTopics(rows: ForgivenessRow[]): ForgivenessRow[] {
  return rows.filter((r) => r.band === 'grudge');
}
