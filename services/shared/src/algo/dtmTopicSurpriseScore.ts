import { DTM_TOPIC_KEYS, type DtmTopicKey } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export interface DtmTopicHistoryEntry {
  topic: string;
  value: number;
}

export interface DtmTopicCurrentRating {
  topic: string;
  value: number;
}

export type DtmSurpriseBand = 'expected' | 'mild' | 'strong' | 'shock' | 'unknown';

export interface DtmTopicSurpriseRow {
  topic: DtmTopicKey;
  current: number;
  baseline: number;
  stddev: number;
  /** standardised deviation from baseline; |z| in stddev units (capped at 10) */
  z: number;
  band: DtmSurpriseBand;
}

const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;

function bandOf(z: number, sampleCount: number): DtmSurpriseBand {
  if (sampleCount < 2) return 'unknown';
  const a = Math.abs(z);
  if (a < 0.5) return 'expected';
  if (a < 1.5) return 'mild';
  if (a < 3) return 'strong';
  return 'shock';
}

export function scoreDtmTopicSurprise(
  current: readonly DtmTopicCurrentRating[],
  history: readonly DtmTopicHistoryEntry[]
): DtmTopicSurpriseRow[] {
  const buckets = new Map<string, number[]>();
  for (const h of history) {
    if (!h || !INDEX.has(h.topic)) continue;
    if (typeof h.value !== 'number' || !Number.isFinite(h.value)) continue;
    const v = clamp(h.value, -1, 1);
    let b = buckets.get(h.topic);
    if (!b) {
      b = [];
      buckets.set(h.topic, b);
    }
    b.push(v);
  }
  const currentMap = new Map<string, number>();
  for (const c of current) {
    if (!c || !INDEX.has(c.topic)) continue;
    if (typeof c.value !== 'number' || !Number.isFinite(c.value)) continue;
    currentMap.set(c.topic, clamp(c.value, -1, 1));
  }
  const rows: DtmTopicSurpriseRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    if (!currentMap.has(topic)) continue;
    const cur = currentMap.get(topic)!;
    const hist = buckets.get(topic) ?? [];
    const n = hist.length;
    if (n === 0) {
      rows.push({ topic, current: cur, baseline: 0, stddev: 0, z: 0, band: 'unknown' });
      continue;
    }
    const baseline = hist.reduce((a, b) => a + b, 0) / n;
    let variance = 0;
    for (const x of hist) variance += (x - baseline) ** 2;
    variance = n > 1 ? variance / (n - 1) : 0;
    const stddev = Math.sqrt(variance);
    // Floor stddev so identical history doesn't yield infinite z; use 0.05 as the floor.
    const denom = Math.max(stddev, 0.05);
    const rawZ = (cur - baseline) / denom;
    const z = clamp(rawZ, -10, 10);
    rows.push({
      topic,
      current: cur,
      baseline,
      stddev,
      z,
      band: bandOf(z, n),
    });
  }
  return rows;
}

export function topDtmSurpriseTopics(
  rows: readonly DtmTopicSurpriseRow[],
  k: number
): DtmTopicSurpriseRow[] {
  if (!Number.isFinite(k) || k <= 0) return [];
  return [...rows]
    .filter((r) => r.band !== 'unknown')
    .sort((a, b) => Math.abs(b.z) - Math.abs(a.z))
    .slice(0, Math.floor(k));
}
