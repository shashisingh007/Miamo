import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type GentlenessSignal = 'tender' | 'soft' | 'mixed' | 'firm' | 'harsh';

export interface GentlenessEvent {
  topic: string;
  signal: GentlenessSignal;
}

const WEIGHTS: Record<GentlenessSignal, number> = {
  tender: 1,
  soft: 0.8,
  mixed: 0.55,
  firm: 0.25,
  harsh: 0,
};

export type GentlenessBand = 'harsh' | 'firm' | 'mixed' | 'soft' | 'untested';

export interface GentlenessRow {
  topic: string;
  n: number;
  score: number;
  band: GentlenessBand;
}

function bandFor(n: number, score: number): GentlenessBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'harsh';
  if (score < 0.55) return 'firm';
  if (score < 0.85) return 'mixed';
  return 'soft';
}

export function summarizeDtmTopicGentlenessExpression(events: GentlenessEvent[]): GentlenessRow[] {
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
  const out: GentlenessRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function harshDtmTopics(rows: GentlenessRow[]): GentlenessRow[] {
  return rows.filter((r) => r.band === 'harsh' || r.band === 'firm');
}
