import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type AweSignal = 'transcendent' | 'awed' | 'mixed' | 'flat' | 'numb';

export interface AweEvent {
  topic: string;
  signal: AweSignal;
}

const WEIGHTS: Record<AweSignal, number> = {
  transcendent: 1,
  awed: 0.8,
  mixed: 0.55,
  flat: 0.25,
  numb: 0,
};

export type AweBand = 'numb' | 'flat' | 'mixed' | 'awed' | 'untested';

export interface AweRow {
  topic: string;
  n: number;
  score: number;
  band: AweBand;
}

function bandFor(n: number, score: number): AweBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'numb';
  if (score < 0.55) return 'flat';
  if (score < 0.85) return 'mixed';
  return 'awed';
}

export function summarizeDtmTopicAweCadence(events: AweEvent[]): AweRow[] {
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
  const out: AweRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function numbDtmTopics(rows: AweRow[]): AweRow[] {
  return rows.filter((r) => r.band === 'numb' || r.band === 'flat');
}
