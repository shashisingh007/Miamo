import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type MirroringFidelitySignal =
  | 'precise-mirror'
  | 'mirroring'
  | 'paraphrase'
  | 'distorted-mirror'
  | 'no-mirror';

export interface MirroringFidelityEvent {
  topic: string;
  signal: MirroringFidelitySignal;
}

const WEIGHTS: Record<MirroringFidelitySignal, number> = {
  'precise-mirror': 1,
  'mirroring': 0.8,
  'paraphrase': 0.55,
  'distorted-mirror': 0.25,
  'no-mirror': 0,
};

export type MirroringFidelityBand =
  | 'no-mirror'
  | 'distorted'
  | 'approximate'
  | 'mirrored'
  | 'untested';

export interface MirroringFidelityRow {
  topic: string;
  n: number;
  score: number;
  band: MirroringFidelityBand;
}

function bandFor(n: number, score: number): MirroringFidelityBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'no-mirror';
  if (score < 0.55) return 'distorted';
  if (score < 0.85) return 'approximate';
  return 'mirrored';
}

export function summarizeDtmTopicMirroringFidelity(
  events: MirroringFidelityEvent[],
): MirroringFidelityRow[] {
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
  const out: MirroringFidelityRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function distortedDtmTopics(rows: MirroringFidelityRow[]): MirroringFidelityRow[] {
  return rows.filter((r) => r.band === 'distorted' || r.band === 'no-mirror');
}
