import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type CelebrationToneSignal = 'celebratory' | 'enthusiastic' | 'mixed' | 'flat' | 'dismissive';

export interface CelebrationToneEvent {
  topic: string;
  signal: CelebrationToneSignal;
}

const WEIGHTS: Record<CelebrationToneSignal, number> = {
  celebratory: 1,
  enthusiastic: 0.8,
  mixed: 0.55,
  flat: 0.25,
  dismissive: 0,
};

export type CelebrationToneBand = 'dismissive' | 'flat' | 'mixed' | 'celebratory' | 'untested';

export interface CelebrationToneRow {
  topic: string;
  n: number;
  score: number;
  band: CelebrationToneBand;
}

function bandFor(n: number, score: number): CelebrationToneBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'dismissive';
  if (score < 0.55) return 'flat';
  if (score < 0.85) return 'mixed';
  return 'celebratory';
}

export function summarizeDtmTopicCelebrationTone(events: CelebrationToneEvent[]): CelebrationToneRow[] {
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
  const out: CelebrationToneRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function dismissiveDtmTopics(rows: CelebrationToneRow[]): CelebrationToneRow[] {
  return rows.filter((r) => r.band === 'dismissive' || r.band === 'flat');
}
