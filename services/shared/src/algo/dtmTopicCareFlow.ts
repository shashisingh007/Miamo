import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type CareFlowSignal = 'devoted' | 'caring' | 'mixed' | 'distant' | 'neglectful';

export interface CareFlowEvent {
  topic: string;
  signal: CareFlowSignal;
}

const WEIGHTS: Record<CareFlowSignal, number> = {
  devoted: 1,
  caring: 0.8,
  mixed: 0.55,
  distant: 0.25,
  neglectful: 0,
};

export type CareFlowBand = 'neglectful' | 'distant' | 'mixed' | 'caring' | 'untested';

export interface CareFlowRow {
  topic: string;
  n: number;
  score: number;
  band: CareFlowBand;
}

function bandFor(n: number, score: number): CareFlowBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'neglectful';
  if (score < 0.55) return 'distant';
  if (score < 0.85) return 'mixed';
  return 'caring';
}

export function summarizeDtmTopicCareFlow(events: CareFlowEvent[]): CareFlowRow[] {
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
  const out: CareFlowRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function neglectfulDtmTopics(rows: CareFlowRow[]): CareFlowRow[] {
  return rows.filter((r) => r.band === 'neglectful' || r.band === 'distant');
}
