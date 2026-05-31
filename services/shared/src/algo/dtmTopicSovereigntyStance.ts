import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type SovereigntySignal =
  | 'sovereign'
  | 'autonomous'
  | 'compliant'
  | 'enmeshed'
  | 'subjugated';

export interface SovereigntyEvent {
  topic: string;
  signal: SovereigntySignal;
}

const WEIGHTS: Record<SovereigntySignal, number> = {
  sovereign: 1,
  autonomous: 0.8,
  compliant: 0.55,
  enmeshed: 0.25,
  subjugated: 0,
};

export type SovereigntyBand =
  | 'subjugated'
  | 'enmeshed'
  | 'compliant'
  | 'autonomous'
  | 'untested';

export interface SovereigntyRow {
  topic: string;
  n: number;
  score: number;
  band: SovereigntyBand;
}

function bandFor(n: number, score: number): SovereigntyBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'subjugated';
  if (score < 0.55) return 'enmeshed';
  if (score < 0.85) return 'compliant';
  return 'autonomous';
}

export function summarizeDtmTopicSovereigntyStance(events: SovereigntyEvent[]): SovereigntyRow[] {
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
  const out: SovereigntyRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function subjugatedDtmTopics(rows: SovereigntyRow[]): SovereigntyRow[] {
  return rows.filter((r) => r.band === 'subjugated' || r.band === 'enmeshed');
}
