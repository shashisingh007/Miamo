import { DTM_TOPIC_KEYS, DtmTopicKey } from './dtmTopics';

export interface DtmAvoidanceEvent {
  topic: string;
  // 'introduced' = brought up; 'engaged' = sustained response; 'deflected' = topic changed/short close.
  action: 'introduced' | 'engaged' | 'deflected';
  ts: number;
}

export interface DtmTopicAvoidanceRow {
  topic: DtmTopicKey;
  introductions: number;
  engagements: number;
  deflections: number;
  avoidanceRate: number; // deflections / introductions, 0 if no introductions
  band: 'untested' | 'open' | 'sometimes' | 'avoidant' | 'heavily-avoided';
}

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export function summarizeDtmTopicAvoidance(
  events: ReadonlyArray<DtmAvoidanceEvent>
): DtmTopicAvoidanceRow[] {
  const buckets = new Map<DtmTopicKey, { i: number; e: number; d: number }>();
  for (const k of DTM_TOPIC_KEYS) buckets.set(k, { i: 0, e: 0, d: 0 });
  for (const ev of events) {
    if (!INDEX.has(ev.topic)) continue;
    const b = buckets.get(ev.topic as DtmTopicKey)!;
    if (ev.action === 'introduced') b.i++;
    else if (ev.action === 'engaged') b.e++;
    else if (ev.action === 'deflected') b.d++;
  }
  const rows: DtmTopicAvoidanceRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const b = buckets.get(topic)!;
    const intros = b.i;
    const avoidanceRate = intros === 0 ? 0 : b.d / intros;
    let band: DtmTopicAvoidanceRow['band'];
    if (intros === 0) band = 'untested';
    else if (avoidanceRate >= 0.75) band = 'heavily-avoided';
    else if (avoidanceRate >= 0.5) band = 'avoidant';
    else if (avoidanceRate >= 0.25) band = 'sometimes';
    else band = 'open';
    rows.push({
      topic,
      introductions: intros,
      engagements: b.e,
      deflections: b.d,
      avoidanceRate,
      band,
    });
  }
  return rows;
}

export function avoidedDtmTopics(
  rows: ReadonlyArray<DtmTopicAvoidanceRow>
): DtmTopicKey[] {
  return rows
    .filter((r) => r.band === 'avoidant' || r.band === 'heavily-avoided')
    .map((r) => r.topic);
}
