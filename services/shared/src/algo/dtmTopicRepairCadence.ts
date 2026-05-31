import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type RepairCadenceSignal = 'rapid' | 'timely' | 'mixed' | 'delayed' | 'absent';

export interface RepairCadenceEvent {
  topic: string;
  signal: RepairCadenceSignal;
}

const WEIGHTS: Record<RepairCadenceSignal, number> = {
  rapid: 1,
  timely: 0.8,
  mixed: 0.55,
  delayed: 0.25,
  absent: 0,
};

export type RepairCadenceBand = 'absent' | 'delayed' | 'mixed' | 'timely' | 'untested';

export interface RepairCadenceRow {
  topic: string;
  n: number;
  score: number;
  band: RepairCadenceBand;
}

function bandFor(n: number, score: number): RepairCadenceBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'absent';
  if (score < 0.55) return 'delayed';
  if (score < 0.85) return 'mixed';
  return 'timely';
}

export function summarizeDtmTopicRepairCadence(events: RepairCadenceEvent[]): RepairCadenceRow[] {
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
  const out: RepairCadenceRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function absentRepairDtmTopics(rows: RepairCadenceRow[]): RepairCadenceRow[] {
  return rows.filter((r) => r.band === 'absent' || r.band === 'delayed');
}
