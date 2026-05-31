import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type IntegrityWeightSignal = 'sound' | 'aligned' | 'mixed' | 'conflicted' | 'compromised';

export interface IntegrityWeightEvent {
  topic: string;
  signal: IntegrityWeightSignal;
}

const WEIGHTS: Record<IntegrityWeightSignal, number> = {
  sound: 1,
  aligned: 0.8,
  mixed: 0.55,
  conflicted: 0.25,
  compromised: 0,
};

export type IntegrityWeightBand = 'compromised' | 'conflicted' | 'mixed' | 'sound' | 'untested';

export interface IntegrityWeightRow {
  topic: string;
  n: number;
  score: number;
  band: IntegrityWeightBand;
}

function bandFor(n: number, score: number): IntegrityWeightBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'compromised';
  if (score < 0.55) return 'conflicted';
  if (score < 0.85) return 'mixed';
  return 'sound';
}

export function summarizeDtmTopicIntegrityWeight(events: IntegrityWeightEvent[]): IntegrityWeightRow[] {
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
  const out: IntegrityWeightRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function compromisedDtmTopics(rows: IntegrityWeightRow[]): IntegrityWeightRow[] {
  return rows.filter((r) => r.band === 'compromised' || r.band === 'conflicted');
}
