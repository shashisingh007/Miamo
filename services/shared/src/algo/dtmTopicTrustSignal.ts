import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type TrustSignal =
  | 'unconditional-trust'
  | 'trust'
  | 'conditional-trust'
  | 'distrust'
  | 'betrayal';

export interface TrustSignalEvent {
  topic: string;
  signal: TrustSignal;
}

const WEIGHTS: Record<TrustSignal, number> = {
  'unconditional-trust': 1,
  trust: 0.8,
  'conditional-trust': 0.55,
  distrust: 0.25,
  betrayal: 0,
};

export type TrustBand =
  | 'betrayal'
  | 'distrust'
  | 'conditional'
  | 'trust'
  | 'untested';

export interface TrustSignalRow {
  topic: string;
  n: number;
  score: number;
  band: TrustBand;
}

function bandFor(n: number, score: number): TrustBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'betrayal';
  if (score < 0.55) return 'distrust';
  if (score < 0.85) return 'conditional';
  return 'trust';
}

export function summarizeDtmTopicTrustSignal(events: TrustSignalEvent[]): TrustSignalRow[] {
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
  const out: TrustSignalRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function betrayedDtmTopics(rows: TrustSignalRow[]): TrustSignalRow[] {
  return rows.filter((r) => r.band === 'betrayal' || r.band === 'distrust');
}
