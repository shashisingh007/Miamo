import { DTM_TOPIC_KEYS, type DtmTopicKey } from './dtmTopics';

export type DtmTopicHeatRow = {
  readonly topic: DtmTopicKey;
  readonly heat: number;
  readonly band: 'cold' | 'warm' | 'hot';
};

const INDEX = new Set<DtmTopicKey>(DTM_TOPIC_KEYS);
const HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000;
const LN2 = Math.log(2);

function clean(n: number): number {
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function bandOf(h: number): DtmTopicHeatRow['band'] {
  if (h < 0.25) return 'cold';
  if (h < 0.75) return 'warm';
  return 'hot';
}

export function summarizeDtmTopicHeat(
  lastTouchedAtMs: ReadonlyMap<DtmTopicKey, number>,
  nowMs: number,
): DtmTopicHeatRow[] {
  const now = Number.isFinite(nowMs) ? nowMs : 0;
  const rows: DtmTopicHeatRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    if (!INDEX.has(topic)) continue;
    const t = clean(lastTouchedAtMs.get(topic) ?? 0);
    let heat = 0;
    if (t > 0 && t <= now) {
      const ageMs = now - t;
      heat = Math.exp(-(ageMs * LN2) / HALF_LIFE_MS);
    } else if (t > now) {
      heat = 1;
    }
    rows.push({ topic, heat, band: bandOf(heat) });
  }
  return rows;
}

export function hottestDtmTopics(
  rows: ReadonlyArray<DtmTopicHeatRow>,
  k: number,
): DtmTopicHeatRow[] {
  const n = Number.isFinite(k) && k > 0 ? Math.floor(k) : 0;
  if (n === 0) return [];
  return rows
    .filter((r) => r.heat > 0)
    .slice()
    .sort((a, b) => b.heat - a.heat || a.topic.localeCompare(b.topic))
    .slice(0, n);
}
