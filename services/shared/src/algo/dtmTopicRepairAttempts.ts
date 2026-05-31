import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type RepairAttemptsSignal =
  | 'genuine-repair'
  | 'soft-bid'
  | 'partial'
  | 'defensive'
  | 'contemptuous-deflect';

export interface RepairAttemptsEvent {
  topic: string;
  signal: RepairAttemptsSignal;
}

const WEIGHTS: Record<RepairAttemptsSignal, number> = {
  'genuine-repair': 1,
  'soft-bid': 0.8,
  'partial': 0.55,
  'defensive': 0.25,
  'contemptuous-deflect': 0,
};

export type RepairAttemptsBand =
  | 'contemptuous'
  | 'defensive'
  | 'partial'
  | 'restored'
  | 'untested';

export interface RepairAttemptsRow {
  topic: string;
  n: number;
  score: number;
  band: RepairAttemptsBand;
}

function bandFor(n: number, score: number): RepairAttemptsBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'contemptuous';
  if (score < 0.55) return 'defensive';
  if (score < 0.85) return 'partial';
  return 'restored';
}

export function summarizeDtmTopicRepairAttempts(
  events: RepairAttemptsEvent[],
): RepairAttemptsRow[] {
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
  const out: RepairAttemptsRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function contemptuousRepairTopics(rows: RepairAttemptsRow[]): RepairAttemptsRow[] {
  return rows.filter((r) => r.band === 'contemptuous');
}
