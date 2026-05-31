import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type ResponsivenessCadenceSignal = 'prompt' | 'timely' | 'mixed' | 'delayed' | 'unresponsive';

export interface ResponsivenessCadenceEvent {
  topic: string;
  signal: ResponsivenessCadenceSignal;
}

const WEIGHTS: Record<ResponsivenessCadenceSignal, number> = {
  prompt: 1,
  timely: 0.8,
  mixed: 0.55,
  delayed: 0.25,
  unresponsive: 0,
};

export type ResponsivenessCadenceBand = 'unresponsive' | 'delayed' | 'mixed' | 'prompt' | 'untested';

export interface ResponsivenessCadenceRow {
  topic: string;
  n: number;
  score: number;
  band: ResponsivenessCadenceBand;
}

function bandFor(n: number, score: number): ResponsivenessCadenceBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'unresponsive';
  if (score < 0.55) return 'delayed';
  if (score < 0.85) return 'mixed';
  return 'prompt';
}

export function summarizeDtmTopicResponsivenessCadence(events: ResponsivenessCadenceEvent[]): ResponsivenessCadenceRow[] {
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
  const out: ResponsivenessCadenceRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function unresponsiveDtmTopics(rows: ResponsivenessCadenceRow[]): ResponsivenessCadenceRow[] {
  return rows.filter((r) => r.band === 'unresponsive' || r.band === 'delayed');
}
