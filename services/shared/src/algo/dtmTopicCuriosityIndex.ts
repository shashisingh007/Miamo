import { DTM_TOPIC_KEYS, DtmTopicKey } from './dtmTopics';

export interface DtmCuriosityEvent {
  topic: string;
  speaker: 'self' | 'partner';
  isQuestion: boolean;
}

export interface DtmTopicCuriosityRow {
  topic: DtmTopicKey;
  partnerQuestions: number;
  selfQuestions: number;
  partnerStatements: number;
  selfStatements: number;
  curiosityIndex: number; // partnerQuestions / max(1, partnerQuestions + partnerStatements)
  band: 'untested' | 'flat' | 'mild' | 'engaged' | 'inquisitive';
}

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export function summarizeDtmTopicCuriosity(
  events: ReadonlyArray<DtmCuriosityEvent>
): DtmTopicCuriosityRow[] {
  const buckets = new Map<
    DtmTopicKey,
    { pq: number; sq: number; ps: number; ss: number }
  >();
  for (const t of DTM_TOPIC_KEYS) buckets.set(t, { pq: 0, sq: 0, ps: 0, ss: 0 });
  for (const e of events) {
    if (!INDEX.has(e.topic)) continue;
    if (e.speaker !== 'self' && e.speaker !== 'partner') continue;
    const b = buckets.get(e.topic as DtmTopicKey)!;
    const q = e.isQuestion === true;
    if (e.speaker === 'partner') q ? b.pq++ : b.ps++;
    else q ? b.sq++ : b.ss++;
  }
  const rows: DtmTopicCuriosityRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const { pq, sq, ps, ss } = buckets.get(topic)!;
    const total = pq + ps;
    let index: number;
    let band: DtmTopicCuriosityRow['band'];
    if (pq + ps + sq + ss === 0) {
      index = 0;
      band = 'untested';
    } else if (total === 0) {
      index = 0;
      band = 'flat';
    } else {
      index = pq / total;
      if (index >= 0.6) band = 'inquisitive';
      else if (index >= 0.35) band = 'engaged';
      else if (index >= 0.15) band = 'mild';
      else band = 'flat';
    }
    rows.push({
      topic,
      partnerQuestions: pq,
      selfQuestions: sq,
      partnerStatements: ps,
      selfStatements: ss,
      curiosityIndex: index,
      band,
    });
  }
  return rows;
}

export function inquisitiveDtmTopics(
  rows: ReadonlyArray<DtmTopicCuriosityRow>
): DtmTopicKey[] {
  return rows
    .filter((r) => r.band === 'engaged' || r.band === 'inquisitive')
    .map((r) => r.topic);
}
