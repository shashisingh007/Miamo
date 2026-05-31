import { DTM_TOPIC_KEYS, DtmTopicKey } from './dtmTopics';

// Measures how quickly bids-for-connection on a topic receive a response.
export type AttunementEventKind = 'bid' | 'turn-toward' | 'turn-away' | 'turn-against';

export interface DtmAttunementEvent {
  topic: string;
  kind: AttunementEventKind;
  at: number;
}

export interface DtmTopicAttunementRow {
  topic: DtmTopicKey;
  bids: number;
  responded: number;
  ignored: number;
  rejected: number;
  medianLatencyMs: number | null;
  band: 'untested' | 'oblivious' | 'sluggish' | 'attentive' | 'tuned';
}

export interface DtmAttunementOptions {
  windowMs?: number;
}

const INDEX = new Set<string>(DTM_TOPIC_KEYS);
const VALID = new Set<AttunementEventKind>(['bid', 'turn-toward', 'turn-away', 'turn-against']);

export function summarizeDtmTopicAttunementWindow(
  events: ReadonlyArray<DtmAttunementEvent>,
  opts: DtmAttunementOptions = {}
): DtmTopicAttunementRow[] {
  const windowMs = opts.windowMs ?? 5 * 60 * 1000;
  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    throw new Error('windowMs must be a positive finite number');
  }
  const byTopic = new Map<DtmTopicKey, DtmAttunementEvent[]>();
  for (const t of DTM_TOPIC_KEYS) byTopic.set(t, []);
  for (const e of events) {
    if (!INDEX.has(e.topic) || !VALID.has(e.kind) || !Number.isFinite(e.at)) continue;
    byTopic.get(e.topic as DtmTopicKey)!.push(e);
  }
  const rows: DtmTopicAttunementRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const list = byTopic.get(topic)!.slice().sort((a, b) => a.at - b.at);
    let bids = 0;
    let responded = 0;
    let ignored = 0;
    let rejected = 0;
    const latencies: number[] = [];
    for (let i = 0; i < list.length; i++) {
      if (list[i].kind !== 'bid') continue;
      bids++;
      const deadline = list[i].at + windowMs;
      let paired: AttunementEventKind | null = null;
      let pairedAt = 0;
      for (let j = i + 1; j < list.length && list[j].at <= deadline; j++) {
        const k = list[j].kind;
        if (k === 'turn-toward' || k === 'turn-away' || k === 'turn-against') {
          paired = k;
          pairedAt = list[j].at;
          break;
        }
      }
      if (paired === 'turn-toward') {
        responded++;
        latencies.push(pairedAt - list[i].at);
      } else if (paired === 'turn-against') rejected++;
      else if (paired === 'turn-away') ignored++;
      else ignored++;
    }
    if (bids === 0) {
      rows.push({
        topic,
        bids: 0,
        responded: 0,
        ignored: 0,
        rejected: 0,
        medianLatencyMs: null,
        band: 'untested',
      });
      continue;
    }
    const respRate = responded / bids;
    const median = latencies.length === 0 ? null : medianOf(latencies);
    let band: DtmTopicAttunementRow['band'];
    if (respRate >= 0.85 && (median ?? Infinity) <= 60 * 1000) band = 'tuned';
    else if (respRate >= 0.6) band = 'attentive';
    else if (respRate >= 0.3) band = 'sluggish';
    else band = 'oblivious';
    rows.push({
      topic,
      bids,
      responded,
      ignored,
      rejected,
      medianLatencyMs: median,
      band,
    });
  }
  return rows;
}

function medianOf(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function obliviousAttunementDtmTopics(
  rows: ReadonlyArray<DtmTopicAttunementRow>
): DtmTopicKey[] {
  return rows.filter((r) => r.band === 'oblivious').map((r) => r.topic);
}
