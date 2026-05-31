import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type CuriositySparkSignal =
  | 'electric-curiosity'
  | 'curious'
  | 'mild-interest'
  | 'flat'
  | 'shutdown';

export interface CuriositySparkEvent {
  topic: string;
  signal: CuriositySparkSignal;
}

const WEIGHTS: Record<CuriositySparkSignal, number> = {
  'electric-curiosity': 1,
  curious: 0.8,
  'mild-interest': 0.55,
  flat: 0.25,
  shutdown: 0,
};

export type CuriositySparkBand =
  | 'shutdown'
  | 'flat'
  | 'interested'
  | 'curious'
  | 'untested';

export interface CuriositySparkRow {
  topic: string;
  n: number;
  score: number;
  band: CuriositySparkBand;
}

function bandFor(n: number, score: number): CuriositySparkBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'shutdown';
  if (score < 0.55) return 'flat';
  if (score < 0.85) return 'interested';
  return 'curious';
}

export function summarizeDtmTopicCuriositySpark(
  events: CuriositySparkEvent[],
): CuriositySparkRow[] {
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
  const out: CuriositySparkRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function shutdownDtmTopics(rows: CuriositySparkRow[]): CuriositySparkRow[] {
  return rows.filter((r) => r.band === 'shutdown' || r.band === 'flat');
}
