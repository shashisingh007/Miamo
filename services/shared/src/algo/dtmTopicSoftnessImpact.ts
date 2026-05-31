import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type SoftnessSignal =
  | 'tender'
  | 'gentle'
  | 'neutral'
  | 'edged'
  | 'harsh';

export interface SoftnessEvent {
  topic: string;
  signal: SoftnessSignal;
}

const WEIGHTS: Record<SoftnessSignal, number> = {
  tender: 1,
  gentle: 0.8,
  neutral: 0.55,
  edged: 0.25,
  harsh: 0,
};

export type SoftnessBand =
  | 'harsh'
  | 'edged'
  | 'neutral'
  | 'soft'
  | 'untested';

export interface SoftnessRow {
  topic: string;
  n: number;
  score: number;
  band: SoftnessBand;
}

function bandFor(n: number, score: number): SoftnessBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'harsh';
  if (score < 0.55) return 'edged';
  if (score < 0.85) return 'neutral';
  return 'soft';
}

export function summarizeDtmTopicSoftnessImpact(events: SoftnessEvent[]): SoftnessRow[] {
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
  const out: SoftnessRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function harshDtmTopics(rows: SoftnessRow[]): SoftnessRow[] {
  return rows.filter((r) => r.band === 'harsh' || r.band === 'edged');
}
