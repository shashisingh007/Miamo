import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type ForgivenessFlowSignal = 'forgiving' | 'softening' | 'mixed' | 'guarded' | 'resentful';

export interface ForgivenessFlowEvent {
  topic: string;
  signal: ForgivenessFlowSignal;
}

const WEIGHTS: Record<ForgivenessFlowSignal, number> = {
  forgiving: 1,
  softening: 0.8,
  mixed: 0.55,
  guarded: 0.25,
  resentful: 0,
};

export type ForgivenessFlowBand = 'resentful' | 'guarded' | 'mixed' | 'forgiving' | 'untested';

export interface ForgivenessFlowRow {
  topic: string;
  n: number;
  score: number;
  band: ForgivenessFlowBand;
}

function bandFor(n: number, score: number): ForgivenessFlowBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'resentful';
  if (score < 0.55) return 'guarded';
  if (score < 0.85) return 'mixed';
  return 'forgiving';
}

export function summarizeDtmTopicForgivenessFlow(events: ForgivenessFlowEvent[]): ForgivenessFlowRow[] {
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
  const out: ForgivenessFlowRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function resentfulDtmTopics(rows: ForgivenessFlowRow[]): ForgivenessFlowRow[] {
  return rows.filter((r) => r.band === 'resentful' || r.band === 'guarded');
}
