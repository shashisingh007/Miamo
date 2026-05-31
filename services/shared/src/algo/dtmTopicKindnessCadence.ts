import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type KindnessCadenceSignal = 'kind' | 'considerate' | 'mixed' | 'curt' | 'unkind';

export interface KindnessCadenceEvent {
  topic: string;
  signal: KindnessCadenceSignal;
}

const WEIGHTS: Record<KindnessCadenceSignal, number> = {
  kind: 1,
  considerate: 0.8,
  mixed: 0.55,
  curt: 0.25,
  unkind: 0,
};

export type KindnessCadenceBand = 'unkind' | 'curt' | 'mixed' | 'kind' | 'untested';

export interface KindnessCadenceRow {
  topic: string;
  n: number;
  score: number;
  band: KindnessCadenceBand;
}

function bandFor(n: number, score: number): KindnessCadenceBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'unkind';
  if (score < 0.55) return 'curt';
  if (score < 0.85) return 'mixed';
  return 'kind';
}

export function summarizeDtmTopicKindnessCadence(
  events: KindnessCadenceEvent[],
): KindnessCadenceRow[] {
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
  const out: KindnessCadenceRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function unkindDtmTopics(rows: KindnessCadenceRow[]): KindnessCadenceRow[] {
  return rows.filter((r) => r.band === 'unkind' || r.band === 'curt');
}
