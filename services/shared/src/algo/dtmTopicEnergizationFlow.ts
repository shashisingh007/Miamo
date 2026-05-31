import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type EnergizationFlowSignal =
  | 'vibrant'
  | 'energized'
  | 'steady'
  | 'drained'
  | 'depleted';

export interface EnergizationFlowEvent {
  topic: string;
  signal: EnergizationFlowSignal;
}

const WEIGHTS: Record<EnergizationFlowSignal, number> = {
  vibrant: 1,
  energized: 0.8,
  steady: 0.55,
  drained: 0.25,
  depleted: 0,
};

export type EnergizationFlowBand =
  | 'depleted'
  | 'drained'
  | 'steady'
  | 'energized'
  | 'untested';

export interface EnergizationFlowRow {
  topic: string;
  n: number;
  score: number;
  band: EnergizationFlowBand;
}

function bandFor(n: number, score: number): EnergizationFlowBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'depleted';
  if (score < 0.55) return 'drained';
  if (score < 0.85) return 'steady';
  return 'energized';
}

export function summarizeDtmTopicEnergizationFlow(events: EnergizationFlowEvent[]): EnergizationFlowRow[] {
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
  const out: EnergizationFlowRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function depletedDtmTopics(rows: EnergizationFlowRow[]): EnergizationFlowRow[] {
  return rows.filter((r) => r.band === 'depleted' || r.band === 'drained');
}
