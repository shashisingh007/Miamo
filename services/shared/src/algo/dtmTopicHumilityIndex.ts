import { DTM_TOPIC_KEYS, DtmTopicKey } from './dtmTopics';

// Tracks humility signals per topic: admits-wrong, concedes-point, asks-curiously vs doubles-down, dismisses.
export type HumilitySignal =
  | 'admit-wrong'
  | 'concede-point'
  | 'ask-curious'
  | 'double-down'
  | 'dismiss';

export interface DtmHumilityEvent {
  topic: string;
  signal: HumilitySignal;
}

export interface DtmTopicHumilityRow {
  topic: DtmTopicKey;
  events: number;
  admit: number;
  concede: number;
  ask: number;
  doubleDown: number;
  dismiss: number;
  humilityScore: number; // 0..1
  band: 'untested' | 'rigid' | 'guarded' | 'open' | 'humble';
}

const INDEX = new Set<string>(DTM_TOPIC_KEYS);
const VALID = new Set<HumilitySignal>([
  'admit-wrong',
  'concede-point',
  'ask-curious',
  'double-down',
  'dismiss',
]);
const W: Record<HumilitySignal, number> = {
  'admit-wrong': 1,
  'concede-point': 0.7,
  'ask-curious': 0.5,
  'double-down': -0.7,
  dismiss: -1,
};

export function summarizeDtmTopicHumility(
  events: ReadonlyArray<DtmHumilityEvent>
): DtmTopicHumilityRow[] {
  const m = new Map<
    DtmTopicKey,
    { aw: number; cp: number; ac: number; dd: number; ds: number; sum: number }
  >();
  for (const t of DTM_TOPIC_KEYS) m.set(t, { aw: 0, cp: 0, ac: 0, dd: 0, ds: 0, sum: 0 });
  for (const e of events) {
    if (!INDEX.has(e.topic) || !VALID.has(e.signal)) continue;
    const b = m.get(e.topic as DtmTopicKey)!;
    if (e.signal === 'admit-wrong') b.aw++;
    else if (e.signal === 'concede-point') b.cp++;
    else if (e.signal === 'ask-curious') b.ac++;
    else if (e.signal === 'double-down') b.dd++;
    else b.ds++;
    b.sum += W[e.signal];
  }
  const rows: DtmTopicHumilityRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const { aw, cp, ac, dd, ds, sum } = m.get(topic)!;
    const n = aw + cp + ac + dd + ds;
    if (n === 0) {
      rows.push({
        topic,
        events: 0,
        admit: 0,
        concede: 0,
        ask: 0,
        doubleDown: 0,
        dismiss: 0,
        humilityScore: 0,
        band: 'untested',
      });
      continue;
    }
    const score = clamp01((sum / n + 1) / 2);
    let band: DtmTopicHumilityRow['band'];
    if (score >= 0.8) band = 'humble';
    else if (score >= 0.6) band = 'open';
    else if (score >= 0.4) band = 'guarded';
    else band = 'rigid';
    rows.push({
      topic,
      events: n,
      admit: aw,
      concede: cp,
      ask: ac,
      doubleDown: dd,
      dismiss: ds,
      humilityScore: score,
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

export function rigidHumilityDtmTopics(
  rows: ReadonlyArray<DtmTopicHumilityRow>
): DtmTopicKey[] {
  return rows.filter((r) => r.band === 'rigid').map((r) => r.topic);
}
