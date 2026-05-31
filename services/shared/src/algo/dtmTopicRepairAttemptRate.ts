import { DTM_TOPIC_KEYS, DtmTopicKey } from './dtmTopics';

export type RepairOutcome = 'attempted' | 'accepted' | 'rejected' | 'ignored';

export interface DtmRepairEvent {
  topic: string;
  outcome: RepairOutcome;
}

export interface DtmTopicRepairAttemptRateRow {
  topic: DtmTopicKey;
  attempts: number;
  accepted: number;
  rejected: number;
  ignored: number;
  acceptanceRate: number; // accepted / attempts, 0 when attempts=0
  band: 'silent' | 'fragile' | 'recovering' | 'resilient';
}

const INDEX = new Set<string>(DTM_TOPIC_KEYS);
const VALID = new Set<RepairOutcome>(['attempted', 'accepted', 'rejected', 'ignored']);

export function summarizeDtmTopicRepairAttempts(
  events: ReadonlyArray<DtmRepairEvent>
): DtmTopicRepairAttemptRateRow[] {
  const m = new Map<DtmTopicKey, { a: number; ok: number; no: number; ig: number }>();
  for (const t of DTM_TOPIC_KEYS) m.set(t, { a: 0, ok: 0, no: 0, ig: 0 });
  for (const e of events) {
    if (!INDEX.has(e.topic) || !VALID.has(e.outcome)) continue;
    const b = m.get(e.topic as DtmTopicKey)!;
    // 'accepted' / 'rejected' / 'ignored' all imply an attempt occurred.
    if (e.outcome === 'attempted') b.a++;
    else if (e.outcome === 'accepted') { b.a++; b.ok++; }
    else if (e.outcome === 'rejected') { b.a++; b.no++; }
    else { b.a++; b.ig++; }
  }
  const rows: DtmTopicRepairAttemptRateRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const { a, ok, no, ig } = m.get(topic)!;
    const rate = a === 0 ? 0 : ok / a;
    let band: DtmTopicRepairAttemptRateRow['band'];
    if (a === 0) band = 'silent';
    else if (rate >= 0.75) band = 'resilient';
    else if (rate >= 0.4) band = 'recovering';
    else band = 'fragile';
    rows.push({
      topic,
      attempts: a,
      accepted: ok,
      rejected: no,
      ignored: ig,
      acceptanceRate: rate,
      band,
    });
  }
  return rows;
}

export function fragileRepairDtmTopics(
  rows: ReadonlyArray<DtmTopicRepairAttemptRateRow>
): DtmTopicKey[] {
  return rows.filter((r) => r.band === 'fragile').map((r) => r.topic);
}
