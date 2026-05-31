import { DTM_TOPIC_KEYS, type DtmTopicKey } from './dtmTopics';

export type DtmTopicVarianceRow = {
  readonly topic: DtmTopicKey;
  readonly variance: number;
  readonly stability: 'stable' | 'mixed' | 'volatile';
};

const INDEX = new Map<DtmTopicKey, number>(DTM_TOPIC_KEYS.map((k, i) => [k, i]));

function clean(values: ReadonlyArray<number>): number[] {
  const out: number[] = [];
  for (const v of values) {
    if (Number.isFinite(v)) out.push(Math.max(-1, Math.min(1, v)));
  }
  return out;
}

function variance(xs: number[]): number {
  if (xs.length < 2) return 0;
  let mean = 0;
  for (const x of xs) mean += x;
  mean /= xs.length;
  let acc = 0;
  for (const x of xs) {
    const d = x - mean;
    acc += d * d;
  }
  return acc / xs.length;
}

function classify(v: number): DtmTopicVarianceRow['stability'] {
  if (v < 0.05) return 'stable';
  if (v < 0.2) return 'mixed';
  return 'volatile';
}

export function summarizeDtmTopicVariance(
  perTopicAnswers: ReadonlyMap<DtmTopicKey, ReadonlyArray<number>>,
): DtmTopicVarianceRow[] {
  const rows: DtmTopicVarianceRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    if (!INDEX.has(topic)) continue;
    const raw = perTopicAnswers.get(topic) ?? [];
    const xs = clean(raw);
    const v = variance(xs);
    rows.push({ topic, variance: v, stability: classify(v) });
  }
  return rows;
}
