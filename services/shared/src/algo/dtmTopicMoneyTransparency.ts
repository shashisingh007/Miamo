import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type MoneyTransparencySignal =
  | 'shared-statement'
  | 'volunteered-detail'
  | 'on-request'
  | 'partial-disclose'
  | 'concealed';

export interface MoneyTransparencyEvent {
  topic: string;
  signal: MoneyTransparencySignal;
}

const WEIGHTS: Record<MoneyTransparencySignal, number> = {
  'shared-statement': 1,
  'volunteered-detail': 0.85,
  'on-request': 0.55,
  'partial-disclose': 0.3,
  'concealed': 0,
};

export type MoneyTransparencyBand = 'concealed' | 'guarded' | 'open' | 'transparent' | 'untested';

export interface MoneyTransparencyRow {
  topic: string;
  n: number;
  score: number;
  band: MoneyTransparencyBand;
}

function bandFor(n: number, score: number): MoneyTransparencyBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'concealed';
  if (score < 0.55) return 'guarded';
  if (score < 0.85) return 'open';
  return 'transparent';
}

export function summarizeDtmTopicMoneyTransparency(events: MoneyTransparencyEvent[]): MoneyTransparencyRow[] {
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
  const out: MoneyTransparencyRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function concealedDtmTopics(rows: MoneyTransparencyRow[]): MoneyTransparencyRow[] {
  return rows.filter((r) => r.band === 'concealed');
}
