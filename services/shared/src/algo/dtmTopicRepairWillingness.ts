import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type RepairWillingnessSignal =
  | 'eager'
  | 'willing'
  | 'reluctant'
  | 'resistant'
  | 'refusing';

export interface RepairWillingnessEvent {
  topic: string;
  signal: RepairWillingnessSignal;
}

const WEIGHTS: Record<RepairWillingnessSignal, number> = {
  eager: 1,
  willing: 0.8,
  reluctant: 0.55,
  resistant: 0.25,
  refusing: 0,
};

export type RepairWillingnessBand =
  | 'refusing'
  | 'resistant'
  | 'reluctant'
  | 'willing'
  | 'untested';

export interface RepairWillingnessRow {
  topic: string;
  n: number;
  score: number;
  band: RepairWillingnessBand;
}

function bandFor(n: number, score: number): RepairWillingnessBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'refusing';
  if (score < 0.55) return 'resistant';
  if (score < 0.85) return 'reluctant';
  return 'willing';
}

export function summarizeDtmTopicRepairWillingness(events: RepairWillingnessEvent[]): RepairWillingnessRow[] {
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
  const out: RepairWillingnessRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function refusingDtmTopics(rows: RepairWillingnessRow[]): RepairWillingnessRow[] {
  return rows.filter((r) => r.band === 'refusing' || r.band === 'resistant');
}
