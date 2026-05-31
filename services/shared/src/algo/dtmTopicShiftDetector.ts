import { DTM_TOPIC_KEYS, type DtmTopicKey } from './dtmTopics';

export type DtmTopicShiftEvent = {
  readonly topic: DtmTopicKey;
  readonly tsMs: number;
  readonly value: number;
};

export type DtmTopicShiftRow = {
  readonly topic: DtmTopicKey;
  readonly before: number;
  readonly after: number;
  readonly delta: number;
  readonly direction: 'up' | 'down' | 'flat';
  readonly significant: boolean;
};

const INDEX = new Set<DtmTopicKey>(DTM_TOPIC_KEYS);
const SIG = 0.1;

function clamp(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(-1, Math.min(1, v));
}

export function detectDtmTopicShifts(
  events: ReadonlyArray<DtmTopicShiftEvent>,
  pivotMs: number,
): DtmTopicShiftRow[] {
  const beforeSum = new Map<DtmTopicKey, number>();
  const beforeCnt = new Map<DtmTopicKey, number>();
  const afterSum = new Map<DtmTopicKey, number>();
  const afterCnt = new Map<DtmTopicKey, number>();

  for (const e of events) {
    if (!e || !INDEX.has(e.topic)) continue;
    if (!Number.isFinite(e.tsMs)) continue;
    const v = clamp(e.value);
    if (e.tsMs < pivotMs) {
      beforeSum.set(e.topic, (beforeSum.get(e.topic) ?? 0) + v);
      beforeCnt.set(e.topic, (beforeCnt.get(e.topic) ?? 0) + 1);
    } else {
      afterSum.set(e.topic, (afterSum.get(e.topic) ?? 0) + v);
      afterCnt.set(e.topic, (afterCnt.get(e.topic) ?? 0) + 1);
    }
  }

  const rows: DtmTopicShiftRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const bc = beforeCnt.get(topic) ?? 0;
    const ac = afterCnt.get(topic) ?? 0;
    const before = bc === 0 ? 0 : (beforeSum.get(topic) ?? 0) / bc;
    const after = ac === 0 ? 0 : (afterSum.get(topic) ?? 0) / ac;
    const delta = after - before;
    let direction: DtmTopicShiftRow['direction'] = 'flat';
    if (delta > SIG) direction = 'up';
    else if (delta < -SIG) direction = 'down';
    rows.push({
      topic,
      before,
      after,
      delta,
      direction,
      significant: Math.abs(delta) > SIG,
    });
  }
  return rows;
}
