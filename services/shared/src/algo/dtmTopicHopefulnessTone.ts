import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type HopefulnessSignal =
  | 'hopeful'
  | 'optimistic'
  | 'neutral'
  | 'discouraged'
  | 'hopeless';

export interface HopefulnessEvent {
  topic: string;
  signal: HopefulnessSignal;
}

const WEIGHTS: Record<HopefulnessSignal, number> = {
  hopeful: 1,
  optimistic: 0.8,
  neutral: 0.55,
  discouraged: 0.25,
  hopeless: 0,
};

export type HopefulnessBand =
  | 'hopeless'
  | 'discouraged'
  | 'neutral'
  | 'optimistic'
  | 'untested';

export interface HopefulnessRow {
  topic: string;
  n: number;
  score: number;
  band: HopefulnessBand;
}

function bandFor(n: number, score: number): HopefulnessBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'hopeless';
  if (score < 0.55) return 'discouraged';
  if (score < 0.85) return 'neutral';
  return 'optimistic';
}

export function summarizeDtmTopicHopefulnessTone(events: HopefulnessEvent[]): HopefulnessRow[] {
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
  const out: HopefulnessRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function hopelessDtmTopics(rows: HopefulnessRow[]): HopefulnessRow[] {
  return rows.filter((r) => r.band === 'hopeless' || r.band === 'discouraged');
}
