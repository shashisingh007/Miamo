import { DTM_TOPIC_KEYS, DtmTopicKey } from './dtmTopics';

export type HumorSignal =
  | 'shared-laugh'
  | 'callback-joke'
  | 'tease'
  | 'sarcasm'
  | 'flat';

export interface DtmHumorEvent {
  topic: string;
  signal: HumorSignal;
}

export interface DtmTopicHumorMomentsRow {
  topic: DtmTopicKey;
  events: number;
  shared: number;
  callbacks: number;
  teases: number;
  sarcasm: number;
  flat: number;
  warmthScore: number; // 0..1
  band: 'untested' | 'dry' | 'wry' | 'warm' | 'playful';
}

const INDEX = new Set<string>(DTM_TOPIC_KEYS);
const VALID = new Set<HumorSignal>([
  'shared-laugh',
  'callback-joke',
  'tease',
  'sarcasm',
  'flat',
]);

const WEIGHTS: Record<HumorSignal, number> = {
  'shared-laugh': 1.0,
  'callback-joke': 0.8,
  tease: 0.2,
  sarcasm: -0.4,
  flat: -0.6,
};

export function summarizeDtmTopicHumorMoments(
  events: ReadonlyArray<DtmHumorEvent>
): DtmTopicHumorMomentsRow[] {
  const m = new Map<
    DtmTopicKey,
    { sh: number; cb: number; te: number; sa: number; fl: number; sum: number }
  >();
  for (const t of DTM_TOPIC_KEYS) m.set(t, { sh: 0, cb: 0, te: 0, sa: 0, fl: 0, sum: 0 });
  for (const e of events) {
    if (!INDEX.has(e.topic) || !VALID.has(e.signal)) continue;
    const b = m.get(e.topic as DtmTopicKey)!;
    if (e.signal === 'shared-laugh') b.sh++;
    else if (e.signal === 'callback-joke') b.cb++;
    else if (e.signal === 'tease') b.te++;
    else if (e.signal === 'sarcasm') b.sa++;
    else b.fl++;
    b.sum += WEIGHTS[e.signal];
  }
  const rows: DtmTopicHumorMomentsRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const { sh, cb, te, sa, fl, sum } = m.get(topic)!;
    const n = sh + cb + te + sa + fl;
    if (n === 0) {
      rows.push({
        topic,
        events: 0,
        shared: 0,
        callbacks: 0,
        teases: 0,
        sarcasm: 0,
        flat: 0,
        warmthScore: 0,
        band: 'untested',
      });
      continue;
    }
    const score = clamp01((sum / n + 1) / 2);
    let band: DtmTopicHumorMomentsRow['band'];
    if (score >= 0.85) band = 'playful';
    else if (score >= 0.65) band = 'warm';
    else if (score >= 0.45) band = 'wry';
    else band = 'dry';
    rows.push({
      topic,
      events: n,
      shared: sh,
      callbacks: cb,
      teases: te,
      sarcasm: sa,
      flat: fl,
      warmthScore: score,
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

export function playfulHumorDtmTopics(
  rows: ReadonlyArray<DtmTopicHumorMomentsRow>
): DtmTopicKey[] {
  return rows.filter((r) => r.band === 'playful').map((r) => r.topic);
}
