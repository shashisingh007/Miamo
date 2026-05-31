import { DTM_TOPIC_KEYS, type DtmTopicKey } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export interface DtmTopicSample {
  topic: string;
  value: number;
}

export type DtmConsistencyBand = 'low' | 'medium' | 'high' | 'unknown';

export interface DtmTopicConsistencyRow {
  topic: DtmTopicKey;
  samples: number;
  mean: number;
  stddev: number;
  consistency: number; // 1 - stddev/2, clamped [0,1]; 1 = perfectly consistent
  band: DtmConsistencyBand;
}

const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;

function bandOf(c: number, n: number): DtmConsistencyBand {
  if (n < 2) return 'unknown';
  if (c < 0.6) return 'low';
  if (c < 0.85) return 'medium';
  return 'high';
}

export function scoreDtmTopicConsistency(
  samples: readonly DtmTopicSample[]
): DtmTopicConsistencyRow[] {
  const buckets = new Map<string, number[]>();
  for (const s of samples) {
    if (!s || !INDEX.has(s.topic)) continue;
    if (typeof s.value !== 'number' || !Number.isFinite(s.value)) continue;
    const v = clamp(s.value, -1, 1);
    let b = buckets.get(s.topic);
    if (!b) {
      b = [];
      buckets.set(s.topic, b);
    }
    b.push(v);
  }
  const rows: DtmTopicConsistencyRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const xs = buckets.get(topic) ?? [];
    const n = xs.length;
    if (n === 0) continue;
    const mean = xs.reduce((a, b) => a + b, 0) / n;
    let variance = 0;
    for (const x of xs) variance += (x - mean) ** 2;
    variance = n > 1 ? variance / (n - 1) : 0;
    const stddev = Math.sqrt(variance);
    const consistency = clamp(1 - stddev / 2, 0, 1);
    rows.push({
      topic,
      samples: n,
      mean,
      stddev,
      consistency,
      band: bandOf(consistency, n),
    });
  }
  return rows;
}

export function overallDtmConsistency(
  rows: readonly DtmTopicConsistencyRow[]
): number {
  const scored = rows.filter((r) => r.samples >= 2);
  if (scored.length === 0) return 0;
  return (
    scored.reduce((a, r) => a + r.consistency, 0) / scored.length
  );
}
