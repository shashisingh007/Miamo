import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type WhollyHeldSignal =
  | 'fully-held'
  | 'embraced'
  | 'supported'
  | 'partial-hold'
  | 'unheld';

export interface WhollyHeldEvent {
  topic: string;
  signal: WhollyHeldSignal;
}

const WEIGHTS: Record<WhollyHeldSignal, number> = {
  'fully-held': 1,
  embraced: 0.8,
  supported: 0.55,
  'partial-hold': 0.25,
  unheld: 0,
};

export type WhollyHeldBand =
  | 'unheld'
  | 'partial-hold'
  | 'supported'
  | 'wholly-held'
  | 'untested';

export interface WhollyHeldRow {
  topic: string;
  n: number;
  score: number;
  band: WhollyHeldBand;
}

function bandFor(n: number, score: number): WhollyHeldBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'unheld';
  if (score < 0.55) return 'partial-hold';
  if (score < 0.85) return 'supported';
  return 'wholly-held';
}

export function summarizeDtmTopicWhollyHeldQuality(events: WhollyHeldEvent[]): WhollyHeldRow[] {
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
  const out: WhollyHeldRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function unheldDtmTopics(rows: WhollyHeldRow[]): WhollyHeldRow[] {
  return rows.filter((r) => r.band === 'unheld' || r.band === 'partial-hold');
}
