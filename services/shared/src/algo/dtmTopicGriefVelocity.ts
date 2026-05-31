import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type GriefVelocitySignal = 'flowing' | 'moving' | 'mixed' | 'sticky' | 'frozen';

export interface GriefVelocityEvent {
  topic: string;
  signal: GriefVelocitySignal;
}

const WEIGHTS: Record<GriefVelocitySignal, number> = {
  flowing: 1,
  moving: 0.8,
  mixed: 0.55,
  sticky: 0.25,
  frozen: 0,
};

export type GriefVelocityBand = 'frozen' | 'sticky' | 'mixed' | 'moving' | 'untested';

export interface GriefVelocityRow {
  topic: string;
  n: number;
  score: number;
  band: GriefVelocityBand;
}

function bandFor(n: number, score: number): GriefVelocityBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'frozen';
  if (score < 0.55) return 'sticky';
  if (score < 0.85) return 'mixed';
  return 'moving';
}

export function summarizeDtmTopicGriefVelocity(events: GriefVelocityEvent[]): GriefVelocityRow[] {
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
  const out: GriefVelocityRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function frozenGriefDtmTopics(rows: GriefVelocityRow[]): GriefVelocityRow[] {
  return rows.filter((r) => r.band === 'frozen' || r.band === 'sticky');
}
