import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type CelebrationWeightSignal =
  | 'exuberant'
  | 'celebratory'
  | 'mixed'
  | 'muted'
  | 'absent';

export interface CelebrationWeightEvent {
  topic: string;
  signal: CelebrationWeightSignal;
}

const WEIGHTS: Record<CelebrationWeightSignal, number> = {
  exuberant: 1,
  celebratory: 0.8,
  mixed: 0.55,
  muted: 0.25,
  absent: 0,
};

export type CelebrationWeightBand =
  | 'absent'
  | 'muted'
  | 'mixed'
  | 'celebratory'
  | 'untested';

export interface CelebrationWeightRow {
  topic: string;
  n: number;
  score: number;
  band: CelebrationWeightBand;
}

function bandFor(n: number, score: number): CelebrationWeightBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'absent';
  if (score < 0.55) return 'muted';
  if (score < 0.85) return 'mixed';
  return 'celebratory';
}

export function summarizeDtmTopicCelebrationWeight(
  events: CelebrationWeightEvent[]
): CelebrationWeightRow[] {
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
  const out: CelebrationWeightRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function absentCelebrationDtmTopics(rows: CelebrationWeightRow[]): CelebrationWeightRow[] {
  return rows.filter((r) => r.band === 'absent' || r.band === 'muted');
}
