import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type CelebrationFlowSignal = 'jubilant' | 'celebratory' | 'mixed' | 'subdued' | 'silent';

export interface CelebrationFlowEvent {
  topic: string;
  signal: CelebrationFlowSignal;
}

const WEIGHTS: Record<CelebrationFlowSignal, number> = {
  jubilant: 1,
  celebratory: 0.8,
  mixed: 0.55,
  subdued: 0.25,
  silent: 0,
};

export type CelebrationFlowBand = 'silent' | 'subdued' | 'mixed' | 'celebratory' | 'untested';

export interface CelebrationFlowRow {
  topic: string;
  n: number;
  score: number;
  band: CelebrationFlowBand;
}

function bandFor(n: number, score: number): CelebrationFlowBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'silent';
  if (score < 0.55) return 'subdued';
  if (score < 0.85) return 'mixed';
  return 'celebratory';
}

export function summarizeDtmTopicCelebrationFlow(events: CelebrationFlowEvent[]): CelebrationFlowRow[] {
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
  const out: CelebrationFlowRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function silentDtmTopics(rows: CelebrationFlowRow[]): CelebrationFlowRow[] {
  return rows.filter((r) => r.band === 'silent' || r.band === 'subdued');
}
