/**
 * dtmReasonChips — Phase 11 DTM reason chips.
 *
 * Given the calling user's DtmVector and a candidate's, emit two chip lists:
 *
 *   - sharedStrengths: topics where both users have a high scalar and the
 *     gap between them is small. Use as "you both deeply care about X".
 *   - conversationStarters: topics where the gap is large AND at least one
 *     side has a meaningful scalar. Use as "ask about X" prompts.
 *
 * The DtmVector is l2-normalised, so scalars live in [0, ~1]. We avoid
 * picking topics where both sides are near zero (not informative).
 *
 * Pure module — no DB, no labels lookups beyond the canonical table.
 */
import { DTM_TOPIC_COUNT, DTM_TOPIC_KEYS, DTM_TOPIC_LABELS, type DtmTopicKey } from './dtmTopics';

export type DtmChip = {
  topic: DtmTopicKey;
  label: string;
  meScalar: number;
  candScalar: number;
  /** |me − cand| */
  gap: number;
  /** min(me, cand) — shared floor. */
  sharedFloor: number;
};

export type DtmChipsResult = {
  sharedStrengths: DtmChip[];
  conversationStarters: DtmChip[];
};

export type DtmChipsOpts = {
  /** Max chips per list. Default 3. */
  topN?: number;
  /** Minimum sharedFloor for a shared-strength chip. Default 0.20. */
  sharedFloorThreshold?: number;
  /** Maximum gap to count as "shared strength". Default 0.15. */
  sharedGapThreshold?: number;
  /** Minimum max(me, cand) for a conversation-starter chip. Default 0.25. */
  starterScalarThreshold?: number;
  /** Minimum gap to count as conversation starter. Default 0.30. */
  starterGapThreshold?: number;
};

function toArray(v: Float32Array | number[] | null | undefined): number[] {
  if (!v) return [];
  const n = Math.min(v.length, DTM_TOPIC_COUNT);
  const out: number[] = new Array(DTM_TOPIC_COUNT).fill(0);
  for (let i = 0; i < n; i++) {
    const x = v[i];
    out[i] = Number.isFinite(x) ? x : 0;
  }
  return out;
}

export function dtmReasonChips(
  me: Float32Array | number[] | null | undefined,
  cand: Float32Array | number[] | null | undefined,
  opts: DtmChipsOpts = {},
): DtmChipsResult {
  const topN = opts.topN ?? 3;
  const sharedFloorThreshold = opts.sharedFloorThreshold ?? 0.20;
  const sharedGapThreshold = opts.sharedGapThreshold ?? 0.15;
  const starterScalarThreshold = opts.starterScalarThreshold ?? 0.25;
  const starterGapThreshold = opts.starterGapThreshold ?? 0.30;

  const a = toArray(me);
  const b = toArray(cand);

  const shared: DtmChip[] = [];
  const starters: DtmChip[] = [];

  for (let i = 0; i < DTM_TOPIC_COUNT; i++) {
    const meScalar = a[i];
    const candScalar = b[i];
    const gap = Math.abs(meScalar - candScalar);
    const sharedFloor = Math.min(meScalar, candScalar);
    const peak = Math.max(meScalar, candScalar);
    const topic = DTM_TOPIC_KEYS[i];
    const label = DTM_TOPIC_LABELS[topic];
    const chip: DtmChip = { topic, label, meScalar, candScalar, gap, sharedFloor };

    if (sharedFloor >= sharedFloorThreshold && gap <= sharedGapThreshold) {
      shared.push(chip);
    } else if (peak >= starterScalarThreshold && gap >= starterGapThreshold) {
      starters.push(chip);
    }
  }

  shared.sort((x, y) => y.sharedFloor - x.sharedFloor || x.gap - y.gap);
  starters.sort((x, y) => y.gap - x.gap || Math.max(y.meScalar, y.candScalar) - Math.max(x.meScalar, x.candScalar));

  return {
    sharedStrengths: shared.slice(0, topN),
    conversationStarters: starters.slice(0, topN),
  };
}
