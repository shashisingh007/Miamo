import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type CompassionDepthSignal = 'deep' | 'warm' | 'mixed' | 'distant' | 'callous';

export interface CompassionDepthEvent {
  topic: string;
  signal: CompassionDepthSignal;
}

const WEIGHTS: Record<CompassionDepthSignal, number> = {
  deep: 1,
  warm: 0.8,
  mixed: 0.55,
  distant: 0.25,
  callous: 0,
};

export type CompassionDepthBand = 'callous' | 'distant' | 'mixed' | 'deep' | 'untested';

export interface CompassionDepthRow {
  topic: string;
  n: number;
  score: number;
  band: CompassionDepthBand;
}

function bandFor(n: number, score: number): CompassionDepthBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'callous';
  if (score < 0.55) return 'distant';
  if (score < 0.85) return 'mixed';
  return 'deep';
}

export function summarizeDtmTopicCompassionDepth(events: CompassionDepthEvent[]): CompassionDepthRow[] {
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
  const out: CompassionDepthRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function callousDtmTopics(rows: CompassionDepthRow[]): CompassionDepthRow[] {
  return rows.filter((r) => r.band === 'callous' || r.band === 'distant');
}
