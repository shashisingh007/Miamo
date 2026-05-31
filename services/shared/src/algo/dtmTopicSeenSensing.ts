import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type SeenSensingSignal =
  | 'fully-seen'
  | 'reflected'
  | 'glimpsed'
  | 'overlooked'
  | 'invisible';

export interface SeenSensingEvent {
  topic: string;
  signal: SeenSensingSignal;
}

const WEIGHTS: Record<SeenSensingSignal, number> = {
  'fully-seen': 1,
  reflected: 0.8,
  glimpsed: 0.55,
  overlooked: 0.25,
  invisible: 0,
};

export type SeenSensingBand =
  | 'invisible'
  | 'overlooked'
  | 'glimpsed'
  | 'seen'
  | 'untested';

export interface SeenSensingRow {
  topic: string;
  n: number;
  score: number;
  band: SeenSensingBand;
}

function bandFor(n: number, score: number): SeenSensingBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'invisible';
  if (score < 0.55) return 'overlooked';
  if (score < 0.85) return 'glimpsed';
  return 'seen';
}

export function summarizeDtmTopicSeenSensing(events: SeenSensingEvent[]): SeenSensingRow[] {
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
  const out: SeenSensingRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function invisibleDtmTopics(rows: SeenSensingRow[]): SeenSensingRow[] {
  return rows.filter((r) => r.band === 'invisible' || r.band === 'overlooked');
}
