import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type HoldingEnvironmentSignal =
  | 'deeply-held'
  | 'held'
  | 'tentative'
  | 'unheld'
  | 'abandoning';

export interface HoldingEnvironmentEvent {
  topic: string;
  signal: HoldingEnvironmentSignal;
}

const WEIGHTS: Record<HoldingEnvironmentSignal, number> = {
  'deeply-held': 1,
  'held': 0.8,
  'tentative': 0.55,
  'unheld': 0.25,
  'abandoning': 0,
};

export type HoldingEnvironmentBand =
  | 'abandoning'
  | 'unheld'
  | 'tentative'
  | 'held'
  | 'untested';

export interface HoldingEnvironmentRow {
  topic: string;
  n: number;
  score: number;
  band: HoldingEnvironmentBand;
}

function bandFor(n: number, score: number): HoldingEnvironmentBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'abandoning';
  if (score < 0.55) return 'unheld';
  if (score < 0.85) return 'tentative';
  return 'held';
}

export function summarizeDtmTopicHoldingEnvironment(
  events: HoldingEnvironmentEvent[],
): HoldingEnvironmentRow[] {
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
  const out: HoldingEnvironmentRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function abandoningDtmTopics(rows: HoldingEnvironmentRow[]): HoldingEnvironmentRow[] {
  return rows.filter((r) => r.band === 'abandoning' || r.band === 'unheld');
}
