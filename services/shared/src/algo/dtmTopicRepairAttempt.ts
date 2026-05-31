import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type RepairAttemptSignal =
  | 'accepted-repair'
  | 'offered-repair'
  | 'partial-accept'
  | 'ignored-repair'
  | 'rejected-repair';

export interface RepairAttemptEvent {
  topic: string;
  signal: RepairAttemptSignal;
}

const WEIGHTS: Record<RepairAttemptSignal, number> = {
  'accepted-repair': 1,
  'offered-repair': 0.7,
  'partial-accept': 0.5,
  'ignored-repair': 0.2,
  'rejected-repair': 0,
};

export type RepairAttemptBand = 'rejected' | 'ignored' | 'attempted' | 'connecting' | 'untested';

export interface RepairAttemptRow {
  topic: string;
  n: number;
  score: number;
  band: RepairAttemptBand;
}

function bandFor(n: number, score: number): RepairAttemptBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'rejected';
  if (score < 0.55) return 'ignored';
  if (score < 0.85) return 'attempted';
  return 'connecting';
}

export function summarizeDtmTopicRepairAttempt(events: RepairAttemptEvent[]): RepairAttemptRow[] {
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
  const out: RepairAttemptRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function rejectedDtmTopics(rows: RepairAttemptRow[]): RepairAttemptRow[] {
  return rows.filter((r) => r.band === 'rejected');
}
