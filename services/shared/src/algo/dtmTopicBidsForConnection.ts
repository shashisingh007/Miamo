import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type BidsForConnectionSignal =
  | 'enthusiastic-turn-toward'
  | 'turn-toward'
  | 'neutral-acknowledge'
  | 'turn-away'
  | 'turn-against';

export interface BidsForConnectionEvent {
  topic: string;
  signal: BidsForConnectionSignal;
}

const WEIGHTS: Record<BidsForConnectionSignal, number> = {
  'enthusiastic-turn-toward': 1,
  'turn-toward': 0.8,
  'neutral-acknowledge': 0.55,
  'turn-away': 0.25,
  'turn-against': 0,
};

export type BidsForConnectionBand =
  | 'against'
  | 'away'
  | 'acknowledging'
  | 'toward'
  | 'untested';

export interface BidsForConnectionRow {
  topic: string;
  n: number;
  score: number;
  band: BidsForConnectionBand;
}

function bandFor(n: number, score: number): BidsForConnectionBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'against';
  if (score < 0.55) return 'away';
  if (score < 0.85) return 'acknowledging';
  return 'toward';
}

export function summarizeDtmTopicBidsForConnection(
  events: BidsForConnectionEvent[],
): BidsForConnectionRow[] {
  const acc = new Map<string, { sum: number; n: number }>();
  for (const t of DTM_TOPIC_KEYS) acc.set(t, { sum: 0, n: 0 });
  for (const e of events) {
    if (!INDEX.has(e.topic)) continue;
    const w = WEIGHTS[e.signal];
    if (w === undefined) continue;
    const cell = acc.get(e.topic)!;
    cell.sum += w;
    cell.n += 1;
  }
  const out: BidsForConnectionRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function againstDtmTopics(rows: BidsForConnectionRow[]): BidsForConnectionRow[] {
  return rows.filter((r) => r.band === 'against');
}
