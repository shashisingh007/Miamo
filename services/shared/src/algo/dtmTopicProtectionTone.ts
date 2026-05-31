import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type ProtectionToneSignal = 'shielding' | 'guarding' | 'mixed' | 'exposing' | 'abandoning';

export interface ProtectionToneEvent {
  topic: string;
  signal: ProtectionToneSignal;
}

const WEIGHTS: Record<ProtectionToneSignal, number> = {
  shielding: 1,
  guarding: 0.8,
  mixed: 0.55,
  exposing: 0.25,
  abandoning: 0,
};

export type ProtectionToneBand = 'abandoning' | 'exposing' | 'mixed' | 'guarding' | 'untested';

export interface ProtectionToneRow {
  topic: string;
  n: number;
  score: number;
  band: ProtectionToneBand;
}

function bandFor(n: number, score: number): ProtectionToneBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'abandoning';
  if (score < 0.55) return 'exposing';
  if (score < 0.85) return 'mixed';
  return 'guarding';
}

export function summarizeDtmTopicProtectionTone(events: ProtectionToneEvent[]): ProtectionToneRow[] {
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
  const out: ProtectionToneRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function abandoningDtmTopics(rows: ProtectionToneRow[]): ProtectionToneRow[] {
  return rows.filter((r) => r.band === 'abandoning' || r.band === 'exposing');
}
