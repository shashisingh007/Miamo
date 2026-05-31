import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type GriefSignal = 'mourning' | 'sorrowful' | 'mixed' | 'tender' | 'shielded';

export interface GriefEvent {
  topic: string;
  signal: GriefSignal;
}

const WEIGHTS: Record<GriefSignal, number> = {
  mourning: 1,
  sorrowful: 0.8,
  mixed: 0.55,
  tender: 0.25,
  shielded: 0,
};

export type GriefBand = 'shielded' | 'tender' | 'mixed' | 'sorrowful' | 'untested';

export interface GriefRow {
  topic: string;
  n: number;
  score: number;
  band: GriefBand;
}

function bandFor(n: number, score: number): GriefBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'shielded';
  if (score < 0.55) return 'tender';
  if (score < 0.85) return 'mixed';
  return 'sorrowful';
}

export function summarizeDtmTopicGriefDepth(events: GriefEvent[]): GriefRow[] {
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
  const out: GriefRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function shieldedDtmTopics(rows: GriefRow[]): GriefRow[] {
  return rows.filter((r) => r.band === 'shielded' || r.band === 'tender');
}
