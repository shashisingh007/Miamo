import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type EmotionalAttunementSignal =
  | 'mirrored-feeling'
  | 'named-feeling'
  | 'acknowledged'
  | 'minimized'
  | 'dismissed';

export interface EmotionalAttunementEvent {
  topic: string;
  signal: EmotionalAttunementSignal;
}

const WEIGHTS: Record<EmotionalAttunementSignal, number> = {
  'mirrored-feeling': 1,
  'named-feeling': 0.8,
  'acknowledged': 0.55,
  'minimized': 0.2,
  'dismissed': 0,
};

export type EmotionalAttunementBand = 'dismissive' | 'shallow' | 'present' | 'attuned' | 'untested';

export interface EmotionalAttunementRow {
  topic: string;
  n: number;
  score: number;
  band: EmotionalAttunementBand;
}

function bandFor(n: number, score: number): EmotionalAttunementBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'dismissive';
  if (score < 0.55) return 'shallow';
  if (score < 0.85) return 'present';
  return 'attuned';
}

export function summarizeDtmTopicEmotionalAttunement(events: EmotionalAttunementEvent[]): EmotionalAttunementRow[] {
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
  const out: EmotionalAttunementRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function dismissiveDtmTopics(rows: EmotionalAttunementRow[]): EmotionalAttunementRow[] {
  return rows.filter((r) => r.band === 'dismissive');
}
