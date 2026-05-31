import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type AttunementEchoSignal = 'mirroring' | 'reflective' | 'mixed' | 'detached' | 'tonedeaf';

export interface AttunementEchoEvent {
  topic: string;
  signal: AttunementEchoSignal;
}

const WEIGHTS: Record<AttunementEchoSignal, number> = {
  mirroring: 1,
  reflective: 0.8,
  mixed: 0.55,
  detached: 0.25,
  tonedeaf: 0,
};

export type AttunementEchoBand = 'tonedeaf' | 'detached' | 'mixed' | 'reflective' | 'untested';

export interface AttunementEchoRow {
  topic: string;
  n: number;
  score: number;
  band: AttunementEchoBand;
}

function bandFor(n: number, score: number): AttunementEchoBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'tonedeaf';
  if (score < 0.55) return 'detached';
  if (score < 0.85) return 'mixed';
  return 'reflective';
}

export function summarizeDtmTopicAttunementEcho(events: AttunementEchoEvent[]): AttunementEchoRow[] {
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
  const out: AttunementEchoRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function tonedeafDtmTopics(rows: AttunementEchoRow[]): AttunementEchoRow[] {
  return rows.filter((r) => r.band === 'tonedeaf' || r.band === 'detached');
}
