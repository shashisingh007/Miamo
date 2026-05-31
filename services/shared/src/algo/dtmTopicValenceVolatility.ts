import { DTM_TOPIC_KEYS, DtmTopicKey } from './dtmTopics';

export interface DtmValenceSample {
  topic: string;
  valence: number; // -1..1
  ts: number;
}

export interface DtmTopicValenceVolatilityRow {
  topic: DtmTopicKey;
  samples: number;
  mean: number;
  variance: number;
  stdDev: number;
  swingRange: number; // max - min
  band: 'untested' | 'steady' | 'fluctuating' | 'volatile' | 'erratic';
}

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

function clamp(v: number): number {
  if (v < -1) return -1;
  if (v > 1) return 1;
  return v;
}

export function summarizeDtmTopicValenceVolatility(
  samples: ReadonlyArray<DtmValenceSample>
): DtmTopicValenceVolatilityRow[] {
  const buckets = new Map<DtmTopicKey, number[]>();
  for (const t of DTM_TOPIC_KEYS) buckets.set(t, []);
  for (const s of samples) {
    if (!INDEX.has(s.topic)) continue;
    if (typeof s.valence !== 'number' || !Number.isFinite(s.valence)) continue;
    buckets.get(s.topic as DtmTopicKey)!.push(clamp(s.valence));
  }
  const rows: DtmTopicValenceVolatilityRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const vals = buckets.get(topic)!;
    const n = vals.length;
    if (n === 0) {
      rows.push({ topic, samples: 0, mean: 0, variance: 0, stdDev: 0, swingRange: 0, band: 'untested' });
      continue;
    }
    let sum = 0;
    let min = vals[0];
    let max = vals[0];
    for (const v of vals) {
      sum += v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const mean = sum / n;
    let sq = 0;
    for (const v of vals) sq += (v - mean) * (v - mean);
    const variance = n > 1 ? sq / (n - 1) : 0;
    const stdDev = Math.sqrt(variance);
    const swingRange = max - min;
    let band: DtmTopicValenceVolatilityRow['band'];
    if (n < 2) band = 'steady';
    else if (stdDev >= 0.6) band = 'erratic';
    else if (stdDev >= 0.35) band = 'volatile';
    else if (stdDev >= 0.15) band = 'fluctuating';
    else band = 'steady';
    rows.push({ topic, samples: n, mean, variance, stdDev, swingRange, band });
  }
  return rows;
}

export function volatileDtmTopics(
  rows: ReadonlyArray<DtmTopicValenceVolatilityRow>
): DtmTopicKey[] {
  return rows.filter((r) => r.band === 'volatile' || r.band === 'erratic').map((r) => r.topic);
}
