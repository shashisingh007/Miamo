import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type PlayAction =
  | 'banter'
  | 'inside-joke'
  | 'shared-laugh'
  | 'serious-only'
  | 'mockery'
  | 'sarcasm-cutting';

export interface PlayEvent {
  topic: string;
  action: PlayAction;
}

const WEIGHTS: Record<PlayAction, number> = {
  banter: 0.85,
  'inside-joke': 1,
  'shared-laugh': 1,
  'serious-only': 0.4,
  mockery: -1,
  'sarcasm-cutting': -0.85,
};

export type PlayfulnessBand = 'caustic' | 'flat' | 'warm' | 'playful' | 'untested';

export interface PlayfulnessRow {
  topic: string;
  n: number;
  score: number;
  band: PlayfulnessBand;
}

function bandFor(n: number, score: number): PlayfulnessBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'caustic';
  if (score < 0.55) return 'flat';
  if (score < 0.8) return 'warm';
  return 'playful';
}

export function summarizeDtmTopicPlayfulness(events: PlayEvent[]): PlayfulnessRow[] {
  const acc = new Map<string, { sum: number; n: number }>();
  for (const t of DTM_TOPIC_KEYS) acc.set(t, { sum: 0, n: 0 });
  for (const e of events) {
    if (!INDEX.has(e.topic)) continue;
    const w = WEIGHTS[e.action];
    if (w === undefined) continue;
    const cell = acc.get(e.topic)!;
    cell.sum += (w + 1) / 2;
    cell.n += 1;
  }
  const out: PlayfulnessRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function causticDtmTopics(rows: PlayfulnessRow[]): PlayfulnessRow[] {
  return rows.filter((r) => r.band === 'caustic');
}
