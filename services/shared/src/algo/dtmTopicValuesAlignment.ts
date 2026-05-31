import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type ValuesAlignmentSignal =
  | 'shared-affirm'
  | 'common-ground'
  | 'agree-to-disagree'
  | 'value-clash'
  | 'value-violation';

export interface ValuesAlignmentEvent {
  topic: string;
  signal: ValuesAlignmentSignal;
}

const WEIGHTS: Record<ValuesAlignmentSignal, number> = {
  'shared-affirm': 1,
  'common-ground': 0.7,
  'agree-to-disagree': 0.4,
  'value-clash': -0.6,
  'value-violation': -1,
};

export type ValuesAlignmentBand = 'fractured' | 'tension' | 'overlapping' | 'aligned' | 'untested';

export interface ValuesAlignmentRow {
  topic: string;
  n: number;
  score: number;
  band: ValuesAlignmentBand;
}

function bandFor(n: number, score: number): ValuesAlignmentBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'fractured';
  if (score < 0.55) return 'tension';
  if (score < 0.8) return 'overlapping';
  return 'aligned';
}

export function summarizeDtmTopicValuesAlignment(
  events: ValuesAlignmentEvent[]
): ValuesAlignmentRow[] {
  const acc = new Map<string, { sum: number; n: number }>();
  for (const t of DTM_TOPIC_KEYS) acc.set(t, { sum: 0, n: 0 });
  for (const e of events) {
    if (!INDEX.has(e.topic)) continue;
    const w = WEIGHTS[e.signal];
    if (w === undefined) continue;
    const cell = acc.get(e.topic)!;
    cell.sum += (w + 1) / 2;
    cell.n += 1;
  }
  const out: ValuesAlignmentRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function fracturedDtmTopics(rows: ValuesAlignmentRow[]): ValuesAlignmentRow[] {
  return rows.filter((r) => r.band === 'fractured');
}
