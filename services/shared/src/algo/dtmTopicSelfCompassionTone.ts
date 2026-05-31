import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type SelfCompassionToneSignal =
  | 'tender'
  | 'kind'
  | 'neutral'
  | 'critical'
  | 'harsh';

export interface SelfCompassionToneEvent {
  topic: string;
  signal: SelfCompassionToneSignal;
}

const WEIGHTS: Record<SelfCompassionToneSignal, number> = {
  tender: 1,
  kind: 0.8,
  neutral: 0.55,
  critical: 0.25,
  harsh: 0,
};

export type SelfCompassionToneBand =
  | 'harsh'
  | 'critical'
  | 'neutral'
  | 'kind'
  | 'untested';

export interface SelfCompassionToneRow {
  topic: string;
  n: number;
  score: number;
  band: SelfCompassionToneBand;
}

function bandFor(n: number, score: number): SelfCompassionToneBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'harsh';
  if (score < 0.55) return 'critical';
  if (score < 0.85) return 'neutral';
  return 'kind';
}

export function summarizeDtmTopicSelfCompassionTone(events: SelfCompassionToneEvent[]): SelfCompassionToneRow[] {
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
  const out: SelfCompassionToneRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function harshSelfTalkDtmTopics(rows: SelfCompassionToneRow[]): SelfCompassionToneRow[] {
  return rows.filter((r) => r.band === 'harsh' || r.band === 'critical');
}
