/**
 * dtmDrift \u2014 Phase 16 DTM analog of `detectDrift`.
 *
 * Watches a user's `DtmVector` between rebuilds (typically nightly by
 * the dtm-vector worker). When a topic's scalar shifts beyond a per-topic
 * threshold, or the L1 distance over all topics exceeds the global
 * threshold, we flag drift and recommend bumping the next-question
 * picker's exploration rate so it samples answers that might confirm or
 * refute the shift.
 *
 * Pure: no DB. Caller persists `newExplorationRate`.
 */
import { DTM_TOPIC_COUNT, DTM_TOPIC_KEYS, type DtmTopicKey } from './dtmTopics';

export type DtmDriftReport = {
  drifted: boolean;
  l1: number;
  maxPerTopic: number;
  topTopic: DtmTopicKey | null;
  newExplorationRate: number;
  perTopicDelta: number[];
};

export type DtmDriftOpts = {
  /** L1 over all topics; default 0.25. */
  l1Threshold?: number;
  /** Per-topic |delta| threshold; default 0.12. */
  perTopic?: number;
  /** Multiplier on exploration when drift detected; default 1.5. */
  explorationBoost?: number;
  /** Current exploration rate (0..1). */
  currentExplorationRate?: number;
};

const MAX_EXPLORATION = 0.40;
const MIN_EXPLORATION = 0.05;

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function toArray(v: Float32Array | number[] | null | undefined): number[] {
  const out: number[] = new Array(DTM_TOPIC_COUNT).fill(0);
  if (!v) return out;
  const n = Math.min(v.length, DTM_TOPIC_COUNT);
  for (let i = 0; i < n; i++) {
    const x = v[i];
    out[i] = Number.isFinite(x) ? x : 0;
  }
  return out;
}

export function detectDtmDrift(
  prev: Float32Array | number[] | null,
  next: Float32Array | number[] | null,
  opts: DtmDriftOpts = {},
): DtmDriftReport {
  const l1Threshold      = opts.l1Threshold      ?? 0.25;
  const perTopic         = opts.perTopic         ?? 0.12;
  const explorationBoost = opts.explorationBoost ?? 1.5;
  const current          = opts.currentExplorationRate ?? 0.10;

  const a = toArray(prev);
  const b = toArray(next);

  let l1 = 0;
  let maxPerTopic = 0;
  let topIdx = -1;
  const perTopicDelta: number[] = new Array(DTM_TOPIC_COUNT);

  for (let i = 0; i < DTM_TOPIC_COUNT; i++) {
    const d = Math.abs(a[i] - b[i]);
    perTopicDelta[i] = d;
    l1 += d;
    if (d > maxPerTopic) { maxPerTopic = d; topIdx = i; }
  }

  const drifted = l1 >= l1Threshold || maxPerTopic >= perTopic;
  const newExplorationRate = drifted
    ? clamp(current * explorationBoost, MIN_EXPLORATION, MAX_EXPLORATION)
    : current;

  return {
    drifted,
    l1,
    maxPerTopic,
    topTopic: topIdx >= 0 ? DTM_TOPIC_KEYS[topIdx] : null,
    newExplorationRate,
    perTopicDelta,
  };
}
