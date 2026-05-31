import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type LightnessQualitySignal =
  | 'buoyant'
  | 'playful'
  | 'easy'
  | 'weighty'
  | 'leaden';

export interface LightnessQualityEvent {
  topic: string;
  signal: LightnessQualitySignal;
}

const WEIGHTS: Record<LightnessQualitySignal, number> = {
  buoyant: 1,
  playful: 0.8,
  easy: 0.55,
  weighty: 0.25,
  leaden: 0,
};

export type LightnessQualityBand =
  | 'leaden'
  | 'weighty'
  | 'easy'
  | 'buoyant'
  | 'untested';

export interface LightnessQualityRow {
  topic: string;
  n: number;
  score: number;
  band: LightnessQualityBand;
}

function bandFor(n: number, score: number): LightnessQualityBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'leaden';
  if (score < 0.55) return 'weighty';
  if (score < 0.85) return 'easy';
  return 'buoyant';
}

export function summarizeDtmTopicLightnessQuality(events: LightnessQualityEvent[]): LightnessQualityRow[] {
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
  const out: LightnessQualityRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function leadenDtmTopics(rows: LightnessQualityRow[]): LightnessQualityRow[] {
  return rows.filter((r) => r.band === 'leaden' || r.band === 'weighty');
}
