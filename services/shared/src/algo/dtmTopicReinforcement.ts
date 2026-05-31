import { DTM_TOPIC_KEYS, type DtmTopicKey } from './dtmTopics';

export type DtmTopicReinforcementInput = {
  readonly recent: ReadonlyArray<number>;
  readonly baseline: ReadonlyArray<number>;
};

export type DtmTopicReinforcementRow = {
  readonly topic: DtmTopicKey;
  readonly shift: number;
  readonly band: 'reinforced' | 'stable' | 'weakened';
};

const INDEX = new Set<DtmTopicKey>(DTM_TOPIC_KEYS);

function meanOf(xs: ReadonlyArray<number>): number {
  if (xs.length === 0) return 0;
  let acc = 0;
  let n = 0;
  for (const v of xs) {
    if (Number.isFinite(v)) {
      acc += Math.max(-1, Math.min(1, v));
      n++;
    }
  }
  return n === 0 ? 0 : acc / n;
}

function bandOf(shift: number): DtmTopicReinforcementRow['band'] {
  if (shift > 0.1) return 'reinforced';
  if (shift < -0.1) return 'weakened';
  return 'stable';
}

export function summarizeDtmTopicReinforcement(
  perTopic: ReadonlyMap<DtmTopicKey, DtmTopicReinforcementInput>,
): DtmTopicReinforcementRow[] {
  const rows: DtmTopicReinforcementRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    if (!INDEX.has(topic)) continue;
    const entry = perTopic.get(topic);
    const recentMean = meanOf(entry?.recent ?? []);
    const baselineMean = meanOf(entry?.baseline ?? []);
    const shift = Math.abs(recentMean) - Math.abs(baselineMean);
    rows.push({ topic, shift, band: bandOf(shift) });
  }
  return rows;
}
