import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type NourishmentDepthSignal = 'nourishing' | 'sustaining' | 'mixed' | 'thin' | 'depleting';

export interface NourishmentDepthEvent {
  topic: string;
  signal: NourishmentDepthSignal;
}

const WEIGHTS: Record<NourishmentDepthSignal, number> = {
  nourishing: 1,
  sustaining: 0.8,
  mixed: 0.55,
  thin: 0.25,
  depleting: 0,
};

export type NourishmentDepthBand = 'depleting' | 'thin' | 'mixed' | 'nourishing' | 'untested';

export interface NourishmentDepthRow {
  topic: string;
  n: number;
  score: number;
  band: NourishmentDepthBand;
}

function bandFor(n: number, score: number): NourishmentDepthBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'depleting';
  if (score < 0.55) return 'thin';
  if (score < 0.85) return 'mixed';
  return 'nourishing';
}

export function summarizeDtmTopicNourishmentDepth(events: NourishmentDepthEvent[]): NourishmentDepthRow[] {
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
  const out: NourishmentDepthRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function depletingDtmTopics(rows: NourishmentDepthRow[]): NourishmentDepthRow[] {
  return rows.filter((r) => r.band === 'depleting' || r.band === 'thin');
}
