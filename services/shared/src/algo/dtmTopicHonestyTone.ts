import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type HonestyToneSignal =
  | 'candid'
  | 'honest'
  | 'hedged'
  | 'evasive'
  | 'deceptive';

export interface HonestyToneEvent {
  topic: string;
  signal: HonestyToneSignal;
}

const WEIGHTS: Record<HonestyToneSignal, number> = {
  candid: 1,
  honest: 0.8,
  hedged: 0.55,
  evasive: 0.25,
  deceptive: 0,
};

export type HonestyToneBand =
  | 'deceptive'
  | 'evasive'
  | 'hedged'
  | 'honest'
  | 'untested';

export interface HonestyToneRow {
  topic: string;
  n: number;
  score: number;
  band: HonestyToneBand;
}

function bandFor(n: number, score: number): HonestyToneBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'deceptive';
  if (score < 0.55) return 'evasive';
  if (score < 0.85) return 'hedged';
  return 'honest';
}

export function summarizeDtmTopicHonestyTone(events: HonestyToneEvent[]): HonestyToneRow[] {
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
  const out: HonestyToneRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function deceptiveDtmTopics(rows: HonestyToneRow[]): HonestyToneRow[] {
  return rows.filter((r) => r.band === 'deceptive' || r.band === 'evasive');
}
