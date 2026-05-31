import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type AppreciationFlowSignal =
  | 'specific-thanks'
  | 'general-thanks'
  | 'acknowledged'
  | 'overlooked'
  | 'dismissed';

export interface AppreciationFlowEvent {
  topic: string;
  signal: AppreciationFlowSignal;
}

const WEIGHTS: Record<AppreciationFlowSignal, number> = {
  'specific-thanks': 1,
  'general-thanks': 0.8,
  'acknowledged': 0.55,
  'overlooked': 0.25,
  'dismissed': 0,
};

export type AppreciationFlowBand =
  | 'dismissed'
  | 'overlooked'
  | 'noticed'
  | 'appreciated'
  | 'untested';

export interface AppreciationFlowRow {
  topic: string;
  n: number;
  score: number;
  band: AppreciationFlowBand;
}

function bandFor(n: number, score: number): AppreciationFlowBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'dismissed';
  if (score < 0.55) return 'overlooked';
  if (score < 0.85) return 'noticed';
  return 'appreciated';
}

export function summarizeDtmTopicAppreciationFlow(
  events: AppreciationFlowEvent[],
): AppreciationFlowRow[] {
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
  const out: AppreciationFlowRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function dismissedDtmTopics(rows: AppreciationFlowRow[]): AppreciationFlowRow[] {
  return rows.filter((r) => r.band === 'dismissed');
}
