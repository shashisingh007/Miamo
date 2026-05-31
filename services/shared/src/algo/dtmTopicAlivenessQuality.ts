import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type AlivenessSignal =
  | 'electric'
  | 'alive'
  | 'present'
  | 'numb'
  | 'deadened';

export interface AlivenessEvent {
  topic: string;
  signal: AlivenessSignal;
}

const WEIGHTS: Record<AlivenessSignal, number> = {
  electric: 1,
  alive: 0.8,
  present: 0.55,
  numb: 0.25,
  deadened: 0,
};

export type AlivenessBand =
  | 'deadened'
  | 'numb'
  | 'present'
  | 'alive'
  | 'untested';

export interface AlivenessRow {
  topic: string;
  n: number;
  score: number;
  band: AlivenessBand;
}

function bandFor(n: number, score: number): AlivenessBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'deadened';
  if (score < 0.55) return 'numb';
  if (score < 0.85) return 'present';
  return 'alive';
}

export function summarizeDtmTopicAlivenessQuality(events: AlivenessEvent[]): AlivenessRow[] {
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
  const out: AlivenessRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function deadenedDtmTopics(rows: AlivenessRow[]): AlivenessRow[] {
  return rows.filter((r) => r.band === 'deadened' || r.band === 'numb');
}
