import { DTM_TOPIC_KEYS, type DtmTopicKey } from './dtmTopics';

export type DtmTopicSaliencyRow = {
  readonly topic: DtmTopicKey;
  readonly saliency: number;
  readonly band: 'low' | 'medium' | 'high';
};

export type DtmTopicSaliencyInput = {
  readonly weight: ReadonlyMap<DtmTopicKey, number>;     // self
  readonly partnerWeight: ReadonlyMap<DtmTopicKey, number>;
};

const INDEX = new Set<DtmTopicKey>(DTM_TOPIC_KEYS);

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function bandOf(s: number): DtmTopicSaliencyRow['band'] {
  if (s >= 0.66) return 'high';
  if (s >= 0.33) return 'medium';
  return 'low';
}

export function summarizeDtmTopicSaliency(
  input: DtmTopicSaliencyInput,
): DtmTopicSaliencyRow[] {
  const rows: DtmTopicSaliencyRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    if (!INDEX.has(topic)) continue;
    const self = clamp01(input.weight.get(topic) ?? 0);
    const partner = clamp01(input.partnerWeight.get(topic) ?? 0);
    const saliency = Math.max(self, partner);
    rows.push({ topic, saliency, band: bandOf(saliency) });
  }
  return rows;
}

export function topDtmSaliencyTopics(
  rows: ReadonlyArray<DtmTopicSaliencyRow>,
  k: number,
): DtmTopicSaliencyRow[] {
  const n = Number.isFinite(k) && k > 0 ? Math.floor(k) : 0;
  if (n === 0) return [];
  return rows
    .filter((r) => r.saliency > 0)
    .slice()
    .sort((a, b) => b.saliency - a.saliency || a.topic.localeCompare(b.topic))
    .slice(0, n);
}
