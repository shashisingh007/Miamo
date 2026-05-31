import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type AccountabilityFlowSignal = 'accountable' | 'owning' | 'mixed' | 'deflecting' | 'evading';

export interface AccountabilityFlowEvent {
  topic: string;
  signal: AccountabilityFlowSignal;
}

const WEIGHTS: Record<AccountabilityFlowSignal, number> = {
  accountable: 1,
  owning: 0.8,
  mixed: 0.55,
  deflecting: 0.25,
  evading: 0,
};

export type AccountabilityFlowBand = 'evading' | 'deflecting' | 'mixed' | 'accountable' | 'untested';

export interface AccountabilityFlowRow {
  topic: string;
  n: number;
  score: number;
  band: AccountabilityFlowBand;
}

function bandFor(n: number, score: number): AccountabilityFlowBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'evading';
  if (score < 0.55) return 'deflecting';
  if (score < 0.85) return 'mixed';
  return 'accountable';
}

export function summarizeDtmTopicAccountabilityFlow(events: AccountabilityFlowEvent[]): AccountabilityFlowRow[] {
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
  const out: AccountabilityFlowRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function unaccountableDtmTopics(rows: AccountabilityFlowRow[]): AccountabilityFlowRow[] {
  return rows.filter((r) => r.band === 'evading' || r.band === 'deflecting');
}
