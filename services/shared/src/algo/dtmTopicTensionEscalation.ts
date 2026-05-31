import { DTM_TOPIC_KEYS, DtmTopicKey } from './dtmTopics';

export interface DtmTensionEvent {
  topic: string;
  ts: number;
  intensity: number; // 0..1  (0 = calm, 1 = max tension)
}

export interface DtmTopicTensionRow {
  topic: DtmTopicKey;
  events: number;
  maxIntensity: number;
  meanIntensity: number;
  escalationSlope: number; // (last - first) over time window, normalized per-event
  band: 'untested' | 'calm' | 'simmering' | 'escalating' | 'boiling';
}

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

export function summarizeDtmTopicTensionEscalation(
  events: ReadonlyArray<DtmTensionEvent>
): DtmTopicTensionRow[] {
  const buckets = new Map<DtmTopicKey, DtmTensionEvent[]>();
  for (const t of DTM_TOPIC_KEYS) buckets.set(t, []);
  for (const e of events) {
    if (!INDEX.has(e.topic)) continue;
    if (typeof e.ts !== 'number' || !Number.isFinite(e.ts)) continue;
    if (typeof e.intensity !== 'number' || !Number.isFinite(e.intensity)) continue;
    buckets.get(e.topic as DtmTopicKey)!.push({ ...e, intensity: clamp01(e.intensity) });
  }
  const rows: DtmTopicTensionRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const list = buckets.get(topic)!.slice().sort((a, b) => a.ts - b.ts);
    if (list.length === 0) {
      rows.push({
        topic,
        events: 0,
        maxIntensity: 0,
        meanIntensity: 0,
        escalationSlope: 0,
        band: 'untested',
      });
      continue;
    }
    let sum = 0;
    let max = 0;
    for (const e of list) {
      sum += e.intensity;
      if (e.intensity > max) max = e.intensity;
    }
    const mean = sum / list.length;
    const slope =
      list.length < 2
        ? 0
        : (list[list.length - 1].intensity - list[0].intensity) / (list.length - 1);
    let band: DtmTopicTensionRow['band'];
    if (mean >= 0.7 || max >= 0.9) band = 'boiling';
    else if (slope > 0.15 || mean >= 0.5) band = 'escalating';
    else if (mean >= 0.25) band = 'simmering';
    else band = 'calm';
    rows.push({
      topic,
      events: list.length,
      maxIntensity: max,
      meanIntensity: mean,
      escalationSlope: slope,
      band,
    });
  }
  return rows;
}

export function escalatingDtmTopics(
  rows: ReadonlyArray<DtmTopicTensionRow>
): DtmTopicKey[] {
  return rows
    .filter((r) => r.band === 'escalating' || r.band === 'boiling')
    .map((r) => r.topic);
}
