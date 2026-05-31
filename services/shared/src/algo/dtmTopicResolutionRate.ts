import { DTM_TOPIC_KEYS, DtmTopicKey } from './dtmTopics';

export type DtmResolutionStatus = 'open' | 'resolved' | 'tabled';

export interface DtmResolutionEvent {
  topic: string;
  threadId: string; // logical conversation thread
  status: DtmResolutionStatus;
  ts: number;
}

export interface DtmTopicResolutionRow {
  topic: DtmTopicKey;
  threads: number;
  resolved: number;
  open: number;
  tabled: number;
  resolutionRate: number; // resolved / threads
  band: 'untested' | 'open' | 'partial' | 'resolved' | 'closed';
}

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export function summarizeDtmTopicResolutionRate(
  events: ReadonlyArray<DtmResolutionEvent>
): DtmTopicResolutionRow[] {
  // Latest status per (topic, threadId)
  const latest = new Map<string, DtmResolutionEvent>();
  for (const e of events) {
    if (!INDEX.has(e.topic)) continue;
    if (typeof e.threadId !== 'string' || !e.threadId) continue;
    if (e.status !== 'open' && e.status !== 'resolved' && e.status !== 'tabled') continue;
    if (typeof e.ts !== 'number' || !Number.isFinite(e.ts)) continue;
    const key = `${e.topic}|${e.threadId}`;
    const prev = latest.get(key);
    if (!prev || e.ts >= prev.ts) latest.set(key, e);
  }

  const buckets = new Map<DtmTopicKey, { r: number; o: number; t: number }>();
  for (const t of DTM_TOPIC_KEYS) buckets.set(t, { r: 0, o: 0, t: 0 });
  for (const e of latest.values()) {
    const b = buckets.get(e.topic as DtmTopicKey)!;
    if (e.status === 'resolved') b.r++;
    else if (e.status === 'open') b.o++;
    else b.t++;
  }
  const rows: DtmTopicResolutionRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const { r, o, t } = buckets.get(topic)!;
    const threads = r + o + t;
    if (threads === 0) {
      rows.push({
        topic,
        threads: 0,
        resolved: 0,
        open: 0,
        tabled: 0,
        resolutionRate: 0,
        band: 'untested',
      });
      continue;
    }
    const rate = r / threads;
    let band: DtmTopicResolutionRow['band'];
    if (rate >= 0.95) band = 'closed';
    else if (rate >= 0.6) band = 'resolved';
    else if (rate >= 0.25) band = 'partial';
    else band = 'open';
    rows.push({
      topic,
      threads,
      resolved: r,
      open: o,
      tabled: t,
      resolutionRate: rate,
      band,
    });
  }
  return rows;
}

export function unresolvedDtmTopics(
  rows: ReadonlyArray<DtmTopicResolutionRow>
): DtmTopicKey[] {
  return rows.filter((r) => r.band === 'open' || r.band === 'partial').map((r) => r.topic);
}
