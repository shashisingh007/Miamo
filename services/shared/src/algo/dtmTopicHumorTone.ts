import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type HumorToneSignal =
  | 'shared-laughter'
  | 'gentle-tease'
  | 'neutral-joke'
  | 'edgy-joke'
  | 'cutting-mock';

export interface HumorToneEvent {
  topic: string;
  signal: HumorToneSignal;
}

const WEIGHTS: Record<HumorToneSignal, number> = {
  'shared-laughter': 1,
  'gentle-tease': 0.8,
  'neutral-joke': 0.55,
  'edgy-joke': 0.25,
  'cutting-mock': 0,
};

export type HumorToneBand = 'cutting' | 'edgy' | 'neutral' | 'warm' | 'untested';

export interface HumorToneRow {
  topic: string;
  n: number;
  score: number;
  band: HumorToneBand;
}

function bandFor(n: number, score: number): HumorToneBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'cutting';
  if (score < 0.55) return 'edgy';
  if (score < 0.85) return 'neutral';
  return 'warm';
}

export function summarizeDtmTopicHumorTone(events: HumorToneEvent[]): HumorToneRow[] {
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
  const out: HumorToneRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function cuttingDtmTopics(rows: HumorToneRow[]): HumorToneRow[] {
  return rows.filter((r) => r.band === 'cutting');
}
