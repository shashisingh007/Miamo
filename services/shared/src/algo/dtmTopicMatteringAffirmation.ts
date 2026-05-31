import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type MatteringAffirmationSignal =
  | 'deeply-affirmed'
  | 'affirmed'
  | 'acknowledged'
  | 'minimized'
  | 'dismissed';

export interface MatteringAffirmationEvent {
  topic: string;
  signal: MatteringAffirmationSignal;
}

const WEIGHTS: Record<MatteringAffirmationSignal, number> = {
  'deeply-affirmed': 1,
  affirmed: 0.8,
  acknowledged: 0.55,
  minimized: 0.25,
  dismissed: 0,
};

export type MatteringAffirmationBand =
  | 'dismissed'
  | 'minimized'
  | 'acknowledged'
  | 'affirmed'
  | 'untested';

export interface MatteringAffirmationRow {
  topic: string;
  n: number;
  score: number;
  band: MatteringAffirmationBand;
}

function bandFor(n: number, score: number): MatteringAffirmationBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'dismissed';
  if (score < 0.55) return 'minimized';
  if (score < 0.85) return 'acknowledged';
  return 'affirmed';
}

export function summarizeDtmTopicMatteringAffirmation(
  events: MatteringAffirmationEvent[],
): MatteringAffirmationRow[] {
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
  const out: MatteringAffirmationRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function dismissedDtmTopics(
  rows: MatteringAffirmationRow[],
): MatteringAffirmationRow[] {
  return rows.filter((r) => r.band === 'dismissed' || r.band === 'minimized');
}
