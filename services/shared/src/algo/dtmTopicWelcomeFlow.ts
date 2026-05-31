import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type WelcomeFlowSignal = 'embraced' | 'welcomed' | 'mixed' | 'tolerated' | 'rejected';

export interface WelcomeFlowEvent {
  topic: string;
  signal: WelcomeFlowSignal;
}

const WEIGHTS: Record<WelcomeFlowSignal, number> = {
  embraced: 1,
  welcomed: 0.8,
  mixed: 0.55,
  tolerated: 0.25,
  rejected: 0,
};

export type WelcomeFlowBand =
  | 'rejected'
  | 'tolerated'
  | 'mixed'
  | 'welcomed'
  | 'untested';

export interface WelcomeFlowRow {
  topic: string;
  n: number;
  score: number;
  band: WelcomeFlowBand;
}

function bandFor(n: number, score: number): WelcomeFlowBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'rejected';
  if (score < 0.55) return 'tolerated';
  if (score < 0.85) return 'mixed';
  return 'welcomed';
}

export function summarizeDtmTopicWelcomeFlow(events: WelcomeFlowEvent[]): WelcomeFlowRow[] {
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
  const out: WelcomeFlowRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function rejectedDtmTopics(rows: WelcomeFlowRow[]): WelcomeFlowRow[] {
  return rows.filter((r) => r.band === 'rejected' || r.band === 'tolerated');
}
