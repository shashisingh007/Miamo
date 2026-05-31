import { DTM_TOPIC_KEYS, DtmTopicKey } from './dtmTopics';

export interface DtmRecoveryEvent {
  topic: string;
  kind: 'rupture' | 'repair';
  ts: number;
}

export interface DtmTopicRecoveryRow {
  topic: DtmTopicKey;
  ruptures: number;
  repairs: number;
  unrepaired: number; // ruptures with no following repair
  avgLatencyMs: number; // average rupture->repair ms across matched pairs (0 if none)
  band: 'untested' | 'quick' | 'slow' | 'stuck' | 'unresolved';
}

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export interface DtmTopicRecoveryOptions {
  quickMs?: number; // default 60 min
  slowMs?: number; // default 24 hr
}

export function summarizeDtmTopicRecoveryLatency(
  events: ReadonlyArray<DtmRecoveryEvent>,
  opts: DtmTopicRecoveryOptions = {}
): DtmTopicRecoveryRow[] {
  const quickMs = opts.quickMs ?? 60 * 60 * 1000;
  const slowMs = opts.slowMs ?? 24 * 60 * 60 * 1000;
  if (slowMs <= quickMs) throw new Error('slowMs must be greater than quickMs');

  const perTopic = new Map<DtmTopicKey, DtmRecoveryEvent[]>();
  for (const t of DTM_TOPIC_KEYS) perTopic.set(t, []);
  for (const e of events) {
    if (!INDEX.has(e.topic)) continue;
    perTopic.get(e.topic as DtmTopicKey)!.push(e);
  }

  const rows: DtmTopicRecoveryRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const evs = perTopic.get(topic)!.slice().sort((x, y) => x.ts - y.ts);
    let ruptures = 0;
    let repairs = 0;
    let unrepaired = 0;
    const latencies: number[] = [];
    let pendingRupture: number | null = null;
    for (const e of evs) {
      if (e.kind === 'rupture') {
        if (pendingRupture !== null) unrepaired++;
        pendingRupture = e.ts;
        ruptures++;
      } else {
        repairs++;
        if (pendingRupture !== null) {
          latencies.push(e.ts - pendingRupture);
          pendingRupture = null;
        }
      }
    }
    if (pendingRupture !== null) unrepaired++;
    const avgLatencyMs =
      latencies.length === 0 ? 0 : latencies.reduce((a, b) => a + b, 0) / latencies.length;
    let band: DtmTopicRecoveryRow['band'];
    if (ruptures === 0) band = 'untested';
    else if (latencies.length === 0) band = 'unresolved';
    else if (unrepaired > 0 && unrepaired >= latencies.length) band = 'stuck';
    else if (avgLatencyMs <= quickMs) band = 'quick';
    else if (avgLatencyMs <= slowMs) band = 'slow';
    else band = 'stuck';
    rows.push({ topic, ruptures, repairs, unrepaired, avgLatencyMs, band });
  }
  return rows;
}

export function unresolvedDtmTopics(rows: ReadonlyArray<DtmTopicRecoveryRow>): DtmTopicKey[] {
  return rows
    .filter((r) => r.band === 'unresolved' || r.band === 'stuck')
    .map((r) => r.topic);
}
