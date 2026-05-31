import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type NurturanceSignal =
  | 'caring-deeply'
  | 'caring'
  | 'occasional'
  | 'sparse'
  | 'withholding';

export interface NurturanceEvent {
  topic: string;
  signal: NurturanceSignal;
}

const WEIGHTS: Record<NurturanceSignal, number> = {
  'caring-deeply': 1,
  caring: 0.8,
  occasional: 0.55,
  sparse: 0.25,
  withholding: 0,
};

export type NurturanceBand = 'withholding' | 'sparse' | 'occasional' | 'caring' | 'untested';

export interface NurturanceRow {
  topic: string;
  n: number;
  score: number;
  band: NurturanceBand;
}

function bandFor(n: number, score: number): NurturanceBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'withholding';
  if (score < 0.55) return 'sparse';
  if (score < 0.85) return 'occasional';
  return 'caring';
}

export function summarizeDtmTopicNurturance(events: NurturanceEvent[]): NurturanceRow[] {
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
  const out: NurturanceRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function withholdingDtmTopics(rows: NurturanceRow[]): NurturanceRow[] {
  return rows.filter((r) => r.band === 'withholding' || r.band === 'sparse');
}
