import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type DevotionDepthSignal =
  | 'consecrated'
  | 'devoted'
  | 'committed'
  | 'distracted'
  | 'indifferent';

export interface DevotionDepthEvent {
  topic: string;
  signal: DevotionDepthSignal;
}

const WEIGHTS: Record<DevotionDepthSignal, number> = {
  consecrated: 1,
  devoted: 0.8,
  committed: 0.55,
  distracted: 0.25,
  indifferent: 0,
};

export type DevotionDepthBand =
  | 'indifferent'
  | 'distracted'
  | 'committed'
  | 'devoted'
  | 'untested';

export interface DevotionDepthRow {
  topic: string;
  n: number;
  score: number;
  band: DevotionDepthBand;
}

function bandFor(n: number, score: number): DevotionDepthBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'indifferent';
  if (score < 0.55) return 'distracted';
  if (score < 0.85) return 'committed';
  return 'devoted';
}

export function summarizeDtmTopicDevotionDepth(events: DevotionDepthEvent[]): DevotionDepthRow[] {
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
  const out: DevotionDepthRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function indifferentDtmTopics(rows: DevotionDepthRow[]): DevotionDepthRow[] {
  return rows.filter((r) => r.band === 'indifferent' || r.band === 'distracted');
}
