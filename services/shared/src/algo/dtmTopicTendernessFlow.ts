import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type TendernessFlowSignal = 'tender' | 'soft' | 'mixed' | 'guarded' | 'hardened';

export interface TendernessFlowEvent {
  topic: string;
  signal: TendernessFlowSignal;
}

const WEIGHTS: Record<TendernessFlowSignal, number> = {
  tender: 1,
  soft: 0.8,
  mixed: 0.55,
  guarded: 0.25,
  hardened: 0,
};

export type TendernessFlowBand = 'hardened' | 'guarded' | 'mixed' | 'soft' | 'untested';

export interface TendernessFlowRow {
  topic: string;
  n: number;
  score: number;
  band: TendernessFlowBand;
}

function bandFor(n: number, score: number): TendernessFlowBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'hardened';
  if (score < 0.55) return 'guarded';
  if (score < 0.85) return 'mixed';
  return 'soft';
}

export function summarizeDtmTopicTendernessFlow(events: TendernessFlowEvent[]): TendernessFlowRow[] {
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
  const out: TendernessFlowRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function hardenedDtmTopics(rows: TendernessFlowRow[]): TendernessFlowRow[] {
  return rows.filter((r) => r.band === 'hardened' || r.band === 'guarded');
}
