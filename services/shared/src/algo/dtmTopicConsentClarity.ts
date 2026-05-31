import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type ConsentClaritySignal = 'explicit' | 'clear' | 'mixed' | 'ambiguous' | 'absent';

export interface ConsentClarityEvent {
  topic: string;
  signal: ConsentClaritySignal;
}

const WEIGHTS: Record<ConsentClaritySignal, number> = {
  explicit: 1,
  clear: 0.8,
  mixed: 0.55,
  ambiguous: 0.25,
  absent: 0,
};

export type ConsentClarityBand = 'absent' | 'ambiguous' | 'mixed' | 'explicit' | 'untested';

export interface ConsentClarityRow {
  topic: string;
  n: number;
  score: number;
  band: ConsentClarityBand;
}

function bandFor(n: number, score: number): ConsentClarityBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'absent';
  if (score < 0.55) return 'ambiguous';
  if (score < 0.85) return 'mixed';
  return 'explicit';
}

export function summarizeDtmTopicConsentClarity(events: ConsentClarityEvent[]): ConsentClarityRow[] {
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
  const out: ConsentClarityRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function unclearConsentDtmTopics(rows: ConsentClarityRow[]): ConsentClarityRow[] {
  return rows.filter((r) => r.band === 'absent' || r.band === 'ambiguous');
}
