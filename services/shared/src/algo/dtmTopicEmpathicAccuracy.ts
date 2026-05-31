import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type EmpathicAccuracySignal =
  | 'precisely-attuned'
  | 'mostly-accurate'
  | 'partial-read'
  | 'misread'
  | 'severely-misread';

export interface EmpathicAccuracyEvent {
  topic: string;
  signal: EmpathicAccuracySignal;
}

const WEIGHTS: Record<EmpathicAccuracySignal, number> = {
  'precisely-attuned': 1,
  'mostly-accurate': 0.8,
  'partial-read': 0.55,
  'misread': 0.25,
  'severely-misread': 0,
};

export type EmpathicAccuracyBand =
  | 'severely-misreading'
  | 'misreading'
  | 'approximate'
  | 'accurate'
  | 'untested';

export interface EmpathicAccuracyRow {
  topic: string;
  n: number;
  score: number;
  band: EmpathicAccuracyBand;
}

function bandFor(n: number, score: number): EmpathicAccuracyBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'severely-misreading';
  if (score < 0.55) return 'misreading';
  if (score < 0.85) return 'approximate';
  return 'accurate';
}

export function summarizeDtmTopicEmpathicAccuracy(
  events: EmpathicAccuracyEvent[],
): EmpathicAccuracyRow[] {
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
  const out: EmpathicAccuracyRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function misreadingDtmTopics(rows: EmpathicAccuracyRow[]): EmpathicAccuracyRow[] {
  return rows.filter((r) => r.band === 'misreading' || r.band === 'severely-misreading');
}
