import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type SafetyToneSignal =
  | 'warm-tone'
  | 'neutral-tone'
  | 'tense-tone'
  | 'cold-tone'
  | 'hostile-tone';

export interface SafetyToneEvent {
  topic: string;
  signal: SafetyToneSignal;
}

const WEIGHTS: Record<SafetyToneSignal, number> = {
  'warm-tone': 1,
  'neutral-tone': 0.6,
  'tense-tone': 0.25,
  'cold-tone': 0.15,
  'hostile-tone': 0,
};

export type SafetyToneBand = 'hostile' | 'cold' | 'cautious' | 'safe' | 'untested';

export interface SafetyToneRow {
  topic: string;
  n: number;
  score: number;
  band: SafetyToneBand;
}

function bandFor(n: number, score: number): SafetyToneBand {
  if (n === 0) return 'untested';
  if (score < 0.25) return 'hostile';
  if (score < 0.5) return 'cold';
  if (score < 0.8) return 'cautious';
  return 'safe';
}

export function summarizeDtmTopicSafetyTone(events: SafetyToneEvent[]): SafetyToneRow[] {
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
  const out: SafetyToneRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function hostileDtmTopics(rows: SafetyToneRow[]): SafetyToneRow[] {
  return rows.filter((r) => r.band === 'hostile');
}
