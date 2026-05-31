import { DTM_TOPIC_KEYS, DtmTopicKey } from './dtmTopics';

export interface DtmDriftEvent {
  topic: string;
  ts: number;
}

export interface DtmTopicDriftRow {
  topic: DtmTopicKey;
  earlyShare: number;
  recentShare: number;
  delta: number; // recent - early
  band: 'cooling' | 'stable' | 'warming' | 'spiking';
}

export interface DtmTopicDriftSummary {
  rows: DtmTopicDriftRow[];
  divergence: number; // total |delta| / 2, 0..1
  band: 'stable' | 'shifting' | 'volatile';
  pivotMs: number | null;
}

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export interface DtmTopicDriftOptions {
  pivotMs?: number; // if absent, use midpoint of min/max ts
}

export function summarizeDtmTopicDrift(
  events: ReadonlyArray<DtmDriftEvent>,
  opts: DtmTopicDriftOptions = {}
): DtmTopicDriftSummary {
  const valid = events.filter((e) => INDEX.has(e.topic));
  const rows: DtmTopicDriftRow[] = DTM_TOPIC_KEYS.map((t) => ({
    topic: t,
    earlyShare: 0,
    recentShare: 0,
    delta: 0,
    band: 'stable',
  }));
  if (valid.length === 0) {
    return { rows, divergence: 0, band: 'stable', pivotMs: null };
  }
  let pivot: number;
  if (opts.pivotMs !== undefined) {
    pivot = opts.pivotMs;
  } else {
    let lo = Infinity;
    let hi = -Infinity;
    for (const e of valid) {
      if (e.ts < lo) lo = e.ts;
      if (e.ts > hi) hi = e.ts;
    }
    pivot = (lo + hi) / 2;
  }
  const earlyCounts = new Map<DtmTopicKey, number>();
  const recentCounts = new Map<DtmTopicKey, number>();
  for (const t of DTM_TOPIC_KEYS) {
    earlyCounts.set(t, 0);
    recentCounts.set(t, 0);
  }
  let earlyTotal = 0;
  let recentTotal = 0;
  for (const e of valid) {
    const t = e.topic as DtmTopicKey;
    if (e.ts < pivot) {
      earlyCounts.set(t, earlyCounts.get(t)! + 1);
      earlyTotal++;
    } else {
      recentCounts.set(t, recentCounts.get(t)! + 1);
      recentTotal++;
    }
  }
  let totalAbsDelta = 0;
  for (let i = 0; i < DTM_TOPIC_KEYS.length; i++) {
    const t = DTM_TOPIC_KEYS[i];
    const earlyShare = earlyTotal === 0 ? 0 : earlyCounts.get(t)! / earlyTotal;
    const recentShare = recentTotal === 0 ? 0 : recentCounts.get(t)! / recentTotal;
    const delta = recentShare - earlyShare;
    let band: DtmTopicDriftRow['band'];
    if (delta >= 0.2) band = 'spiking';
    else if (delta >= 0.05) band = 'warming';
    else if (delta <= -0.05) band = 'cooling';
    else band = 'stable';
    rows[i].earlyShare = earlyShare;
    rows[i].recentShare = recentShare;
    rows[i].delta = delta;
    rows[i].band = band;
    totalAbsDelta += Math.abs(delta);
  }
  const divergence = totalAbsDelta / 2;
  let bandOverall: DtmTopicDriftSummary['band'];
  if (divergence >= 0.4) bandOverall = 'volatile';
  else if (divergence >= 0.15) bandOverall = 'shifting';
  else bandOverall = 'stable';
  return { rows, divergence, band: bandOverall, pivotMs: pivot };
}

export function driftedDtmTopics(rows: ReadonlyArray<DtmTopicDriftRow>): DtmTopicKey[] {
  return rows.filter((r) => r.band === 'spiking' || r.band === 'cooling').map((r) => r.topic);
}
