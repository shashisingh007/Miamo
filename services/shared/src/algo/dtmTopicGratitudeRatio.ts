import { DTM_TOPIC_KEYS, DtmTopicKey } from './dtmTopics';

export type GratitudeSignal =
  | 'gratitude'
  | 'appreciation'
  | 'compliment'
  | 'criticism'
  | 'complaint'
  | 'silence';

export interface DtmGratitudeEvent {
  topic: string;
  signal: GratitudeSignal;
}

export interface DtmTopicGratitudeRatioRow {
  topic: DtmTopicKey;
  events: number;
  positive: number;
  negative: number;
  silence: number;
  ratio: number; // positive / (positive + negative); 0 if both zero
  band: 'untested' | 'starved' | 'lean' | 'nourished' | 'lavish';
}

const INDEX = new Set<string>(DTM_TOPIC_KEYS);
const VALID = new Set<GratitudeSignal>([
  'gratitude',
  'appreciation',
  'compliment',
  'criticism',
  'complaint',
  'silence',
]);

export function summarizeDtmTopicGratitudeRatio(
  events: ReadonlyArray<DtmGratitudeEvent>
): DtmTopicGratitudeRatioRow[] {
  const m = new Map<DtmTopicKey, { p: number; n: number; s: number }>();
  for (const t of DTM_TOPIC_KEYS) m.set(t, { p: 0, n: 0, s: 0 });
  for (const e of events) {
    if (!INDEX.has(e.topic) || !VALID.has(e.signal)) continue;
    const b = m.get(e.topic as DtmTopicKey)!;
    if (e.signal === 'gratitude' || e.signal === 'appreciation' || e.signal === 'compliment') b.p++;
    else if (e.signal === 'criticism' || e.signal === 'complaint') b.n++;
    else b.s++;
  }
  const rows: DtmTopicGratitudeRatioRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const { p, n, s } = m.get(topic)!;
    const total = p + n + s;
    if (total === 0) {
      rows.push({ topic, events: 0, positive: 0, negative: 0, silence: 0, ratio: 0, band: 'untested' });
      continue;
    }
    const denom = p + n;
    const ratio = denom === 0 ? 0 : p / denom;
    let band: DtmTopicGratitudeRatioRow['band'];
    if (denom === 0) band = 'starved';
    else if (ratio >= 0.85) band = 'lavish';
    else if (ratio >= 0.6) band = 'nourished';
    else if (ratio >= 0.35) band = 'lean';
    else band = 'starved';
    rows.push({ topic, events: total, positive: p, negative: n, silence: s, ratio, band });
  }
  return rows;
}

export function starvedGratitudeDtmTopics(
  rows: ReadonlyArray<DtmTopicGratitudeRatioRow>
): DtmTopicKey[] {
  return rows.filter((r) => r.band === 'starved').map((r) => r.topic);
}
