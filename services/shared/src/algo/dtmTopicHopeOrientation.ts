import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type HopeOrientationSignal =
  | 'hopeful-and-realistic'
  | 'hopeful'
  | 'mixed'
  | 'fading'
  | 'despairing';

export interface HopeOrientationEvent {
  topic: string;
  signal: HopeOrientationSignal;
}

const WEIGHTS: Record<HopeOrientationSignal, number> = {
  'hopeful-and-realistic': 1,
  hopeful: 0.8,
  mixed: 0.55,
  fading: 0.25,
  despairing: 0,
};

export type HopeOrientationBand = 'despairing' | 'fading' | 'mixed' | 'hopeful' | 'untested';

export interface HopeOrientationRow {
  topic: string;
  n: number;
  score: number;
  band: HopeOrientationBand;
}

function bandFor(n: number, score: number): HopeOrientationBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'despairing';
  if (score < 0.55) return 'fading';
  if (score < 0.85) return 'mixed';
  return 'hopeful';
}

export function summarizeDtmTopicHopeOrientation(events: HopeOrientationEvent[]): HopeOrientationRow[] {
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
  const out: HopeOrientationRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function despairingDtmTopics(rows: HopeOrientationRow[]): HopeOrientationRow[] {
  return rows.filter((r) => r.band === 'despairing' || r.band === 'fading');
}
