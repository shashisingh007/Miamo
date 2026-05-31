import { DTM_TOPIC_KEYS, DtmTopicKey } from './dtmTopics';

export interface DtmForgivenessEvent {
  topic: string;
  rupturedAt: number; // epoch ms
  forgivenAt: number; // epoch ms; must be >= rupturedAt
}

export interface DtmTopicForgivenessVelocityRow {
  topic: DtmTopicKey;
  events: number;
  meanLatencyMs: number;
  medianLatencyMs: number;
  fastestMs: number;
  slowestMs: number;
  band: 'untested' | 'glacial' | 'slow' | 'steady' | 'swift';
}

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export function summarizeDtmTopicForgivenessVelocity(
  events: ReadonlyArray<DtmForgivenessEvent>
): DtmTopicForgivenessVelocityRow[] {
  const m = new Map<DtmTopicKey, number[]>();
  for (const t of DTM_TOPIC_KEYS) m.set(t, []);
  for (const e of events) {
    if (!INDEX.has(e.topic)) continue;
    if (!Number.isFinite(e.rupturedAt) || !Number.isFinite(e.forgivenAt)) continue;
    const delta = e.forgivenAt - e.rupturedAt;
    if (delta < 0) continue;
    m.get(e.topic as DtmTopicKey)!.push(delta);
  }
  const rows: DtmTopicForgivenessVelocityRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const arr = m.get(topic)!;
    if (arr.length === 0) {
      rows.push({
        topic,
        events: 0,
        meanLatencyMs: 0,
        medianLatencyMs: 0,
        fastestMs: 0,
        slowestMs: 0,
        band: 'untested',
      });
      continue;
    }
    const sorted = [...arr].sort((a, b) => a - b);
    const mean = sorted.reduce((s, x) => s + x, 0) / sorted.length;
    const median =
      sorted.length % 2 === 1
        ? sorted[(sorted.length - 1) / 2]
        : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
    let band: DtmTopicForgivenessVelocityRow['band'];
    if (median <= HOUR) band = 'swift';
    else if (median <= DAY) band = 'steady';
    else if (median <= 7 * DAY) band = 'slow';
    else band = 'glacial';
    rows.push({
      topic,
      events: arr.length,
      meanLatencyMs: mean,
      medianLatencyMs: median,
      fastestMs: sorted[0],
      slowestMs: sorted[sorted.length - 1],
      band,
    });
  }
  return rows;
}

export function glacialForgivenessDtmTopics(
  rows: ReadonlyArray<DtmTopicForgivenessVelocityRow>
): DtmTopicKey[] {
  return rows.filter((r) => r.band === 'glacial').map((r) => r.topic);
}
