import { DTM_TOPIC_KEYS, DtmTopicKey } from './dtmTopics';

// Gottman-inspired "Four Horsemen" tracker for DTM topics.
export type HorsemanSignal =
  | 'criticism'
  | 'contempt'
  | 'defensiveness'
  | 'stonewalling'
  | 'soft-startup'
  | 'repair';

export interface DtmHorsemanEvent {
  topic: string;
  signal: HorsemanSignal;
}

export interface DtmTopicHorsemanRow {
  topic: DtmTopicKey;
  events: number;
  criticism: number;
  contempt: number;
  defensiveness: number;
  stonewalling: number;
  softStartup: number;
  repair: number;
  toxicityScore: number; // 0..1
  band: 'untested' | 'healthy' | 'tense' | 'hostile' | 'corrosive';
}

const INDEX = new Set<string>(DTM_TOPIC_KEYS);
const VALID = new Set<HorsemanSignal>([
  'criticism',
  'contempt',
  'defensiveness',
  'stonewalling',
  'soft-startup',
  'repair',
]);

const WEIGHTS: Record<HorsemanSignal, number> = {
  criticism: 0.6,
  contempt: 1.0,
  defensiveness: 0.5,
  stonewalling: 0.7,
  'soft-startup': -0.5,
  repair: -0.7,
};

export function summarizeDtmTopicHorsemen(
  events: ReadonlyArray<DtmHorsemanEvent>
): DtmTopicHorsemanRow[] {
  const m = new Map<
    DtmTopicKey,
    { cr: number; co: number; de: number; st: number; ss: number; re: number; sum: number }
  >();
  for (const t of DTM_TOPIC_KEYS) m.set(t, { cr: 0, co: 0, de: 0, st: 0, ss: 0, re: 0, sum: 0 });
  for (const e of events) {
    if (!INDEX.has(e.topic) || !VALID.has(e.signal)) continue;
    const b = m.get(e.topic as DtmTopicKey)!;
    if (e.signal === 'criticism') b.cr++;
    else if (e.signal === 'contempt') b.co++;
    else if (e.signal === 'defensiveness') b.de++;
    else if (e.signal === 'stonewalling') b.st++;
    else if (e.signal === 'soft-startup') b.ss++;
    else b.re++;
    b.sum += WEIGHTS[e.signal];
  }
  const rows: DtmTopicHorsemanRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const { cr, co, de, st, ss, re, sum } = m.get(topic)!;
    const n = cr + co + de + st + ss + re;
    if (n === 0) {
      rows.push({
        topic,
        events: 0,
        criticism: 0,
        contempt: 0,
        defensiveness: 0,
        stonewalling: 0,
        softStartup: 0,
        repair: 0,
        toxicityScore: 0,
        band: 'untested',
      });
      continue;
    }
    const tox = clamp01((sum / n + 1) / 2);
    let band: DtmTopicHorsemanRow['band'];
    if (tox >= 0.85) band = 'corrosive';
    else if (tox >= 0.65) band = 'hostile';
    else if (tox >= 0.4) band = 'tense';
    else band = 'healthy';
    rows.push({
      topic,
      events: n,
      criticism: cr,
      contempt: co,
      defensiveness: de,
      stonewalling: st,
      softStartup: ss,
      repair: re,
      toxicityScore: tox,
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

export function corrosiveHorsemanDtmTopics(
  rows: ReadonlyArray<DtmTopicHorsemanRow>
): DtmTopicKey[] {
  return rows.filter((r) => r.band === 'corrosive').map((r) => r.topic);
}
