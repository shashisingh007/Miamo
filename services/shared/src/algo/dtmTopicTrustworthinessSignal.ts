import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type TrustworthinessSignal =
  | 'consistent'
  | 'reliable'
  | 'mixed'
  | 'flaky'
  | 'breaking';

export interface TrustworthinessEvent {
  topic: string;
  signal: TrustworthinessSignal;
}

const WEIGHTS: Record<TrustworthinessSignal, number> = {
  consistent: 1,
  reliable: 0.8,
  mixed: 0.55,
  flaky: 0.25,
  breaking: 0,
};

export type TrustworthinessBand =
  | 'breaking'
  | 'flaky'
  | 'mixed'
  | 'reliable'
  | 'untested';

export interface TrustworthinessRow {
  topic: string;
  n: number;
  score: number;
  band: TrustworthinessBand;
}

function bandFor(n: number, score: number): TrustworthinessBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'breaking';
  if (score < 0.55) return 'flaky';
  if (score < 0.85) return 'mixed';
  return 'reliable';
}

export function summarizeDtmTopicTrustworthinessSignal(events: TrustworthinessEvent[]): TrustworthinessRow[] {
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
  const out: TrustworthinessRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function untrustworthyDtmTopics(rows: TrustworthinessRow[]): TrustworthinessRow[] {
  return rows.filter((r) => r.band === 'breaking' || r.band === 'flaky');
}
