import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type JoyWeightSignal = 'radiant' | 'joyful' | 'mixed' | 'flat' | 'joyless';

export interface JoyWeightEvent {
  topic: string;
  signal: JoyWeightSignal;
}

const WEIGHTS: Record<JoyWeightSignal, number> = {
  radiant: 1,
  joyful: 0.8,
  mixed: 0.55,
  flat: 0.25,
  joyless: 0,
};

export type JoyWeightBand = 'joyless' | 'flat' | 'mixed' | 'joyful' | 'untested';

export interface JoyWeightRow {
  topic: string;
  n: number;
  score: number;
  band: JoyWeightBand;
}

function bandFor(n: number, score: number): JoyWeightBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'joyless';
  if (score < 0.55) return 'flat';
  if (score < 0.85) return 'mixed';
  return 'joyful';
}

export function summarizeDtmTopicJoyWeight(events: JoyWeightEvent[]): JoyWeightRow[] {
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
  const out: JoyWeightRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function joylessDtmTopics(rows: JoyWeightRow[]): JoyWeightRow[] {
  return rows.filter((r) => r.band === 'joyless' || r.band === 'flat');
}
