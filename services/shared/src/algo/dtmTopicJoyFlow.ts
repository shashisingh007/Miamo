import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type JoyFlowSignal = 'radiant' | 'bright' | 'mixed' | 'subdued' | 'flat';

export interface JoyFlowEvent {
  topic: string;
  signal: JoyFlowSignal;
}

const WEIGHTS: Record<JoyFlowSignal, number> = {
  radiant: 1,
  bright: 0.8,
  mixed: 0.55,
  subdued: 0.25,
  flat: 0,
};

export type JoyFlowBand = 'flat' | 'subdued' | 'mixed' | 'bright' | 'untested';

export interface JoyFlowRow {
  topic: string;
  n: number;
  score: number;
  band: JoyFlowBand;
}

function bandFor(n: number, score: number): JoyFlowBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'flat';
  if (score < 0.55) return 'subdued';
  if (score < 0.85) return 'mixed';
  return 'bright';
}

export function summarizeDtmTopicJoyFlow(events: JoyFlowEvent[]): JoyFlowRow[] {
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
  const out: JoyFlowRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function flatJoyDtmTopics(rows: JoyFlowRow[]): JoyFlowRow[] {
  return rows.filter((r) => r.band === 'flat' || r.band === 'subdued');
}
