import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type SafetyEchoSignal = 'reassuring' | 'steadying' | 'mixed' | 'unsettling' | 'alarming';

export interface SafetyEchoEvent {
  topic: string;
  signal: SafetyEchoSignal;
}

const WEIGHTS: Record<SafetyEchoSignal, number> = {
  reassuring: 1,
  steadying: 0.8,
  mixed: 0.55,
  unsettling: 0.25,
  alarming: 0,
};

export type SafetyEchoBand = 'alarming' | 'unsettling' | 'mixed' | 'steadying' | 'untested';

export interface SafetyEchoRow {
  topic: string;
  n: number;
  score: number;
  band: SafetyEchoBand;
}

function bandFor(n: number, score: number): SafetyEchoBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'alarming';
  if (score < 0.55) return 'unsettling';
  if (score < 0.85) return 'mixed';
  return 'steadying';
}

export function summarizeDtmTopicSafetyEcho(events: SafetyEchoEvent[]): SafetyEchoRow[] {
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
  const out: SafetyEchoRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function alarmingDtmTopics(rows: SafetyEchoRow[]): SafetyEchoRow[] {
  return rows.filter((r) => r.band === 'alarming' || r.band === 'unsettling');
}
