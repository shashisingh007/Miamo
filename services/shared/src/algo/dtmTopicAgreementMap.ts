import { DTM_TOPIC_KEYS, type DtmTopicKey } from './dtmTopics';

export type DtmTopicAgreementInput = {
  readonly self: ReadonlyMap<DtmTopicKey, number>;
  readonly other: ReadonlyMap<DtmTopicKey, number>;
};

export type DtmTopicAgreementRow = {
  readonly topic: DtmTopicKey;
  readonly delta: number;
  readonly agreement: number;
  readonly band: 'aligned' | 'mixed' | 'divergent';
};

export type DtmAgreementSummary = {
  readonly rows: ReadonlyArray<DtmTopicAgreementRow>;
  readonly overall: number;
  readonly topDivergent: ReadonlyArray<DtmTopicAgreementRow>;
};

const INDEX = new Set<DtmTopicKey>(DTM_TOPIC_KEYS);

function clamp(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(-1, Math.min(1, v));
}

function bandOf(agreement: number): DtmTopicAgreementRow['band'] {
  if (agreement >= 0.8) return 'aligned';
  if (agreement >= 0.5) return 'mixed';
  return 'divergent';
}

export function summarizeDtmTopicAgreement(
  input: DtmTopicAgreementInput,
): DtmAgreementSummary {
  const rows: DtmTopicAgreementRow[] = [];
  let acc = 0;
  for (const topic of DTM_TOPIC_KEYS) {
    if (!INDEX.has(topic)) continue;
    const a = clamp(input.self.get(topic) ?? 0);
    const b = clamp(input.other.get(topic) ?? 0);
    const delta = Math.abs(a - b);
    const agreement = 1 - delta / 2; // delta in [0,2] -> agreement [0,1]
    acc += agreement;
    rows.push({ topic, delta, agreement, band: bandOf(agreement) });
  }
  const overall = rows.length === 0 ? 0 : acc / rows.length;
  const topDivergent = rows
    .slice()
    .sort((x, y) => y.delta - x.delta || x.topic.localeCompare(y.topic))
    .slice(0, 3);
  return { rows, overall, topDivergent };
}
