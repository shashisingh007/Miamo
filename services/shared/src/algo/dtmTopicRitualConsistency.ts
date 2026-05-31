import { DTM_TOPIC_KEYS, DtmTopicKey } from './dtmTopics';

export interface DtmRitualEvent {
  topic: string;
  ritualKey: string; // e.g. "morning-checkin"
  occurredAt: number; // epoch ms
}

export interface DtmTopicRitualConsistencyRow {
  topic: DtmTopicKey;
  rituals: number;
  occurrences: number;
  meanIntervalDays: number; // mean gap between consecutive occurrences (across all rituals)
  consistencyScore: number; // 0..1
  band: 'untested' | 'absent' | 'sporadic' | 'rhythmic' | 'devoted';
}

const INDEX = new Set<string>(DTM_TOPIC_KEYS);
const DAY_MS = 24 * 60 * 60 * 1000;

export function summarizeDtmTopicRitualConsistency(
  events: ReadonlyArray<DtmRitualEvent>,
  observationWindowMs: number
): DtmTopicRitualConsistencyRow[] {
  if (!Number.isFinite(observationWindowMs) || observationWindowMs <= 0) {
    throw new Error('observationWindowMs must be a positive finite number');
  }
  const grouped = new Map<DtmTopicKey, Map<string, number[]>>();
  for (const t of DTM_TOPIC_KEYS) grouped.set(t, new Map());
  for (const e of events) {
    if (!INDEX.has(e.topic)) continue;
    if (typeof e.ritualKey !== 'string' || e.ritualKey.length === 0) continue;
    if (!Number.isFinite(e.occurredAt)) continue;
    const byKey = grouped.get(e.topic as DtmTopicKey)!;
    let arr = byKey.get(e.ritualKey);
    if (!arr) {
      arr = [];
      byKey.set(e.ritualKey, arr);
    }
    arr.push(e.occurredAt);
  }
  const rows: DtmTopicRitualConsistencyRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const byKey = grouped.get(topic)!;
    if (byKey.size === 0) {
      rows.push({
        topic,
        rituals: 0,
        occurrences: 0,
        meanIntervalDays: 0,
        consistencyScore: 0,
        band: 'untested',
      });
      continue;
    }
    let occurrences = 0;
    const intervals: number[] = [];
    for (const arr of byKey.values()) {
      arr.sort((a, b) => a - b);
      occurrences += arr.length;
      for (let i = 1; i < arr.length; i++) intervals.push(arr[i] - arr[i - 1]);
    }
    if (occurrences < 2) {
      // Single-occurrence rituals -> absent of rhythm
      rows.push({
        topic,
        rituals: byKey.size,
        occurrences,
        meanIntervalDays: 0,
        consistencyScore: 0,
        band: 'absent',
      });
      continue;
    }
    const meanInterval =
      intervals.reduce((s, x) => s + x, 0) / Math.max(1, intervals.length);
    // Coefficient of variation across intervals (lower is more consistent).
    const variance =
      intervals.reduce((s, x) => s + (x - meanInterval) * (x - meanInterval), 0) /
      Math.max(1, intervals.length);
    const stdDev = Math.sqrt(variance);
    const cv = meanInterval === 0 ? 1 : stdDev / meanInterval;
    // Density: how much of the window did the rituals cover.
    const density = Math.min(1, occurrences / Math.max(1, observationWindowMs / DAY_MS));
    const consistency = clamp01((1 - clamp01(cv)) * 0.6 + density * 0.4);
    let band: DtmTopicRitualConsistencyRow['band'];
    if (consistency >= 0.85) band = 'devoted';
    else if (consistency >= 0.6) band = 'rhythmic';
    else if (consistency >= 0.3) band = 'sporadic';
    else band = 'absent';
    rows.push({
      topic,
      rituals: byKey.size,
      occurrences,
      meanIntervalDays: meanInterval / DAY_MS,
      consistencyScore: consistency,
      band,
    });
  }
  return rows;
}

function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

export function devotedRitualDtmTopics(
  rows: ReadonlyArray<DtmTopicRitualConsistencyRow>
): DtmTopicKey[] {
  return rows.filter((r) => r.band === 'devoted').map((r) => r.topic);
}
