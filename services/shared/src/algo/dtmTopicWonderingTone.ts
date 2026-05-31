import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type WonderingToneSignal = 'wondering' | 'curious' | 'mixed' | 'flat' | 'closed';

export interface WonderingToneEvent {
  topic: string;
  signal: WonderingToneSignal;
}

const WEIGHTS: Record<WonderingToneSignal, number> = {
  wondering: 1,
  curious: 0.8,
  mixed: 0.55,
  flat: 0.25,
  closed: 0,
};

export type WonderingToneBand = 'closed' | 'flat' | 'mixed' | 'wondering' | 'untested';

export interface WonderingToneRow {
  topic: string;
  n: number;
  score: number;
  band: WonderingToneBand;
}

function bandFor(n: number, score: number): WonderingToneBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'closed';
  if (score < 0.55) return 'flat';
  if (score < 0.85) return 'mixed';
  return 'wondering';
}

export function summarizeDtmTopicWonderingTone(events: WonderingToneEvent[]): WonderingToneRow[] {
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
  const out: WonderingToneRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function closedDtmTopics(rows: WonderingToneRow[]): WonderingToneRow[] {
  return rows.filter((r) => r.band === 'closed' || r.band === 'flat');
}
