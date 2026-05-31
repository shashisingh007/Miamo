import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type HonestyFlowSignal = 'transparent' | 'honest' | 'mixed' | 'guarded' | 'deceptive';

export interface HonestyFlowEvent {
  topic: string;
  signal: HonestyFlowSignal;
}

const WEIGHTS: Record<HonestyFlowSignal, number> = {
  transparent: 1,
  honest: 0.8,
  mixed: 0.55,
  guarded: 0.25,
  deceptive: 0,
};

export type HonestyFlowBand =
  | 'deceptive'
  | 'guarded'
  | 'mixed'
  | 'honest'
  | 'untested';

export interface HonestyFlowRow {
  topic: string;
  n: number;
  score: number;
  band: HonestyFlowBand;
}

function bandFor(n: number, score: number): HonestyFlowBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'deceptive';
  if (score < 0.55) return 'guarded';
  if (score < 0.85) return 'mixed';
  return 'honest';
}

export function summarizeDtmTopicHonestyFlow(events: HonestyFlowEvent[]): HonestyFlowRow[] {
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
  const out: HonestyFlowRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function deceptiveDtmTopics(rows: HonestyFlowRow[]): HonestyFlowRow[] {
  return rows.filter((r) => r.band === 'deceptive' || r.band === 'guarded');
}
