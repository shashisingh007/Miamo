import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type AccountabilityStanceSignal =
  | 'owning'
  | 'accountable'
  | 'partial'
  | 'deflecting'
  | 'blaming';

export interface AccountabilityStanceEvent {
  topic: string;
  signal: AccountabilityStanceSignal;
}

const WEIGHTS: Record<AccountabilityStanceSignal, number> = {
  owning: 1,
  accountable: 0.8,
  partial: 0.55,
  deflecting: 0.25,
  blaming: 0,
};

export type AccountabilityStanceBand =
  | 'blaming'
  | 'deflecting'
  | 'partial'
  | 'accountable'
  | 'untested';

export interface AccountabilityStanceRow {
  topic: string;
  n: number;
  score: number;
  band: AccountabilityStanceBand;
}

function bandFor(n: number, score: number): AccountabilityStanceBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'blaming';
  if (score < 0.55) return 'deflecting';
  if (score < 0.85) return 'partial';
  return 'accountable';
}

export function summarizeDtmTopicAccountabilityStance(events: AccountabilityStanceEvent[]): AccountabilityStanceRow[] {
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
  const out: AccountabilityStanceRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function blamingDtmTopics(rows: AccountabilityStanceRow[]): AccountabilityStanceRow[] {
  return rows.filter((r) => r.band === 'blaming' || r.band === 'deflecting');
}
