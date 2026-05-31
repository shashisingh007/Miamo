import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type CompassionFlowSignal =
  | 'tender'
  | 'caring'
  | 'sympathetic'
  | 'detached'
  | 'callous';

export interface CompassionFlowEvent {
  topic: string;
  signal: CompassionFlowSignal;
}

const WEIGHTS: Record<CompassionFlowSignal, number> = {
  tender: 1,
  caring: 0.8,
  sympathetic: 0.55,
  detached: 0.25,
  callous: 0,
};

export type CompassionFlowBand =
  | 'callous'
  | 'detached'
  | 'sympathetic'
  | 'compassionate'
  | 'untested';

export interface CompassionFlowRow {
  topic: string;
  n: number;
  score: number;
  band: CompassionFlowBand;
}

function bandFor(n: number, score: number): CompassionFlowBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'callous';
  if (score < 0.55) return 'detached';
  if (score < 0.85) return 'sympathetic';
  return 'compassionate';
}

export function summarizeDtmTopicCompassionFlow(events: CompassionFlowEvent[]): CompassionFlowRow[] {
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
  const out: CompassionFlowRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function callousDtmTopics(rows: CompassionFlowRow[]): CompassionFlowRow[] {
  return rows.filter((r) => r.band === 'callous' || r.band === 'detached');
}
