import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type SeriousnessCadenceSignal =
  | 'grave'
  | 'serious'
  | 'measured'
  | 'flippant'
  | 'dismissive';

export interface SeriousnessCadenceEvent {
  topic: string;
  signal: SeriousnessCadenceSignal;
}

const WEIGHTS: Record<SeriousnessCadenceSignal, number> = {
  grave: 1,
  serious: 0.8,
  measured: 0.55,
  flippant: 0.25,
  dismissive: 0,
};

export type SeriousnessCadenceBand =
  | 'dismissive'
  | 'flippant'
  | 'measured'
  | 'serious'
  | 'untested';

export interface SeriousnessCadenceRow {
  topic: string;
  n: number;
  score: number;
  band: SeriousnessCadenceBand;
}

function bandFor(n: number, score: number): SeriousnessCadenceBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'dismissive';
  if (score < 0.55) return 'flippant';
  if (score < 0.85) return 'measured';
  return 'serious';
}

export function summarizeDtmTopicSeriousnessCadence(events: SeriousnessCadenceEvent[]): SeriousnessCadenceRow[] {
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
  const out: SeriousnessCadenceRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function flippantDtmTopics(rows: SeriousnessCadenceRow[]): SeriousnessCadenceRow[] {
  return rows.filter((r) => r.band === 'dismissive' || r.band === 'flippant');
}
