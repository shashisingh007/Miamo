import { DTM_TOPIC_KEYS, type DtmTopicKey } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export interface DtmTopicGapSample {
  topic: string;
  self: number;
  partner: number;
  tsMs: number;
}

export type DtmConvergenceDirection =
  | 'converging'
  | 'stable'
  | 'diverging'
  | 'unknown';

export interface DtmTopicConvergenceRow {
  topic: DtmTopicKey;
  earlyGap: number;
  recentGap: number;
  /** delta = earlyGap - recentGap; positive means gap shrank */
  delta: number;
  direction: DtmConvergenceDirection;
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

function dirOf(delta: number, hasBoth: boolean): DtmConvergenceDirection {
  if (!hasBoth) return 'unknown';
  if (delta > 0.1) return 'converging';
  if (delta < -0.1) return 'diverging';
  return 'stable';
}

export interface DtmTopicConvergenceOptions {
  /** pivot timestamp: samples < pivot are "early", ≥ pivot are "recent" */
  pivotMs: number;
}

export function computeDtmTopicConvergence(
  samples: readonly DtmTopicGapSample[],
  opts: DtmTopicConvergenceOptions
): DtmTopicConvergenceRow[] {
  if (!Number.isFinite(opts.pivotMs)) return [];
  type Bucket = { earlyGap: number; earlyN: number; recentGap: number; recentN: number };
  const buckets = new Map<string, Bucket>();
  for (const s of samples) {
    if (!s || !INDEX.has(s.topic)) continue;
    if (
      typeof s.self !== 'number' ||
      typeof s.partner !== 'number' ||
      typeof s.tsMs !== 'number' ||
      !Number.isFinite(s.self) ||
      !Number.isFinite(s.partner) ||
      !Number.isFinite(s.tsMs)
    )
      continue;
    const self = clamp(s.self, -1, 1);
    const partner = clamp(s.partner, -1, 1);
    const gap = Math.abs(self - partner) / 2; // [0,1]
    let b = buckets.get(s.topic);
    if (!b) {
      b = { earlyGap: 0, earlyN: 0, recentGap: 0, recentN: 0 };
      buckets.set(s.topic, b);
    }
    if (s.tsMs < opts.pivotMs) {
      b.earlyGap += gap;
      b.earlyN++;
    } else {
      b.recentGap += gap;
      b.recentN++;
    }
  }
  const rows: DtmTopicConvergenceRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const b = buckets.get(topic);
    if (!b || b.earlyN + b.recentN === 0) continue;
    const earlyGap = b.earlyN > 0 ? b.earlyGap / b.earlyN : 0;
    const recentGap = b.recentN > 0 ? b.recentGap / b.recentN : 0;
    const hasBoth = b.earlyN > 0 && b.recentN > 0;
    const delta = hasBoth ? earlyGap - recentGap : 0;
    rows.push({
      topic,
      earlyGap,
      recentGap,
      delta,
      direction: dirOf(delta, hasBoth),
    });
  }
  return rows;
}

export function overallDtmConvergenceShift(
  rows: readonly DtmTopicConvergenceRow[]
): number {
  const scored = rows.filter((r) => r.direction !== 'unknown');
  if (scored.length === 0) return 0;
  return scored.reduce((a, r) => a + r.delta, 0) / scored.length;
}
