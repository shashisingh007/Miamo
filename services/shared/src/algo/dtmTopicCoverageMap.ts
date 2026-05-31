import { DTM_TOPIC_KEYS, type DtmTopicKey } from './dtmTopics';

export type DtmTopicCoverageRow = {
  readonly topic: DtmTopicKey;
  readonly answered: number;
  readonly target: number;
  readonly ratio: number;
  readonly tier: 'untouched' | 'partial' | 'covered' | 'saturated';
};

const INDEX = new Set<DtmTopicKey>(DTM_TOPIC_KEYS);

function clean(n: number): number {
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function tierOf(ratio: number): DtmTopicCoverageRow['tier'] {
  if (ratio <= 0) return 'untouched';
  if (ratio < 0.5) return 'partial';
  if (ratio < 1) return 'covered';
  return 'saturated';
}

export function summarizeDtmTopicCoverage(
  answeredPerTopic: ReadonlyMap<DtmTopicKey, number>,
  targetPerTopic: number | ReadonlyMap<DtmTopicKey, number>,
): DtmTopicCoverageRow[] {
  const rows: DtmTopicCoverageRow[] = [];
  const fallback = typeof targetPerTopic === 'number' ? clean(targetPerTopic) : 0;
  for (const topic of DTM_TOPIC_KEYS) {
    if (!INDEX.has(topic)) continue;
    const a = clean(answeredPerTopic.get(topic) ?? 0);
    const t =
      typeof targetPerTopic === 'number'
        ? fallback
        : clean(targetPerTopic.get(topic) ?? 0);
    const ratio = t === 0 ? (a > 0 ? 1 : 0) : a / t;
    rows.push({ topic, answered: a, target: t, ratio, tier: tierOf(ratio) });
  }
  return rows;
}

export function overallDtmCoverageRatio(
  rows: ReadonlyArray<DtmTopicCoverageRow>,
): number {
  if (rows.length === 0) return 0;
  let acc = 0;
  for (const r of rows) acc += Math.min(1, r.ratio);
  return acc / rows.length;
}
