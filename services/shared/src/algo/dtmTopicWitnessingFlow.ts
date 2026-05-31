import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type WitnessingFlowSignal = 'present' | 'attentive' | 'mixed' | 'distracted' | 'absent';

export interface WitnessingFlowEvent {
  topic: string;
  signal: WitnessingFlowSignal;
}

const WEIGHTS: Record<WitnessingFlowSignal, number> = {
  present: 1,
  attentive: 0.8,
  mixed: 0.55,
  distracted: 0.25,
  absent: 0,
};

export type WitnessingFlowBand = 'absent' | 'distracted' | 'mixed' | 'attentive' | 'untested';

export interface WitnessingFlowRow {
  topic: string;
  n: number;
  score: number;
  band: WitnessingFlowBand;
}

function bandFor(n: number, score: number): WitnessingFlowBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'absent';
  if (score < 0.55) return 'distracted';
  if (score < 0.85) return 'mixed';
  return 'attentive';
}

export function summarizeDtmTopicWitnessingFlow(events: WitnessingFlowEvent[]): WitnessingFlowRow[] {
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
  const out: WitnessingFlowRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function absentDtmTopics(rows: WitnessingFlowRow[]): WitnessingFlowRow[] {
  return rows.filter((r) => r.band === 'absent' || r.band === 'distracted');
}
