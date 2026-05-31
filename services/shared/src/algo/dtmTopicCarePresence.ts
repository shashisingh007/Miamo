import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type CarePresenceSignal = 'attentive' | 'caring' | 'mixed' | 'distracted' | 'absent';

export interface CarePresenceEvent {
  topic: string;
  signal: CarePresenceSignal;
}

const WEIGHTS: Record<CarePresenceSignal, number> = {
  attentive: 1,
  caring: 0.8,
  mixed: 0.55,
  distracted: 0.25,
  absent: 0,
};

export type CarePresenceBand = 'absent' | 'distracted' | 'mixed' | 'attentive' | 'untested';

export interface CarePresenceRow {
  topic: string;
  n: number;
  score: number;
  band: CarePresenceBand;
}

function bandFor(n: number, score: number): CarePresenceBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'absent';
  if (score < 0.55) return 'distracted';
  if (score < 0.85) return 'mixed';
  return 'attentive';
}

export function summarizeDtmTopicCarePresence(events: CarePresenceEvent[]): CarePresenceRow[] {
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
  const out: CarePresenceRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function absentDtmTopics(rows: CarePresenceRow[]): CarePresenceRow[] {
  return rows.filter((r) => r.band === 'absent' || r.band === 'distracted');
}
