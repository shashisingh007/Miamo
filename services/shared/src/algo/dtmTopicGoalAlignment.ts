import { DTM_TOPIC_KEYS, type DtmTopicKey } from './dtmTopics';

export type DtmTopicGoalAlignmentInput = {
  readonly self: ReadonlyMap<DtmTopicKey, number>;
  readonly goal: ReadonlyMap<DtmTopicKey, number>;
};

export type DtmTopicGoalAlignmentRow = {
  readonly topic: DtmTopicKey;
  readonly gap: number;
  readonly alignment: number;
  readonly status: 'on_track' | 'drift' | 'off_track';
};

export type DtmGoalAlignmentSummary = {
  readonly rows: ReadonlyArray<DtmTopicGoalAlignmentRow>;
  readonly overall: number;
};

const INDEX = new Set<DtmTopicKey>(DTM_TOPIC_KEYS);

function clamp(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(-1, Math.min(1, v));
}

function statusOf(gap: number): DtmTopicGoalAlignmentRow['status'] {
  if (gap <= 0.2) return 'on_track';
  if (gap <= 0.6) return 'drift';
  return 'off_track';
}

export function summarizeDtmGoalAlignment(
  input: DtmTopicGoalAlignmentInput,
): DtmGoalAlignmentSummary {
  const rows: DtmTopicGoalAlignmentRow[] = [];
  let acc = 0;
  for (const topic of DTM_TOPIC_KEYS) {
    if (!INDEX.has(topic)) continue;
    const s = clamp(input.self.get(topic) ?? 0);
    const g = clamp(input.goal.get(topic) ?? 0);
    const gap = Math.abs(s - g);
    const alignment = 1 - gap / 2;
    acc += alignment;
    rows.push({ topic, gap, alignment, status: statusOf(gap) });
  }
  const overall = rows.length === 0 ? 0 : acc / rows.length;
  return { rows, overall };
}
