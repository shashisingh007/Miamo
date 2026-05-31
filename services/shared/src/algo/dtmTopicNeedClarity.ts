import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type NeedClarityLevel = 'concrete-ask' | 'feeling-named' | 'vague-hint' | 'mind-read-expected' | 'silent';

export interface NeedClarityEvent {
  topic: string;
  level: NeedClarityLevel;
}

const WEIGHTS: Record<NeedClarityLevel, number> = {
  'concrete-ask': 1,
  'feeling-named': 0.75,
  'vague-hint': 0.4,
  'mind-read-expected': 0.15,
  silent: 0,
};

export type NeedClarityBand = 'silent' | 'vague' | 'clear' | 'explicit' | 'untested';

export interface NeedClarityRow {
  topic: string;
  n: number;
  score: number;
  band: NeedClarityBand;
}

function bandFor(n: number, score: number): NeedClarityBand {
  if (n === 0) return 'untested';
  if (score < 0.25) return 'silent';
  if (score < 0.55) return 'vague';
  if (score < 0.85) return 'clear';
  return 'explicit';
}

export function summarizeDtmTopicNeedClarity(events: NeedClarityEvent[]): NeedClarityRow[] {
  const acc = new Map<string, { sum: number; n: number }>();
  for (const t of DTM_TOPIC_KEYS) acc.set(t, { sum: 0, n: 0 });
  for (const e of events) {
    if (!INDEX.has(e.topic)) continue;
    const w = WEIGHTS[e.level];
    if (w === undefined) continue;
    const cell = acc.get(e.topic)!;
    cell.sum += w;
    cell.n += 1;
  }
  const out: NeedClarityRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function silentDtmTopics(rows: NeedClarityRow[]): NeedClarityRow[] {
  return rows.filter((r) => r.band === 'silent');
}
