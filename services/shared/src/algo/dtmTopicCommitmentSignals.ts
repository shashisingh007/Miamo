import { DTM_TOPIC_KEYS, DtmTopicKey } from './dtmTopics';

// Tracks commitment-language signals per topic: future-plan, exclusivity, naming-shared-future vs hedging/escape.
export type CommitmentSignal =
  | 'future-plan'
  | 'exclusivity'
  | 'public-claim'
  | 'hedge'
  | 'escape-hatch';

export interface DtmCommitmentEvent {
  topic: string;
  signal: CommitmentSignal;
}

export interface DtmTopicCommitmentRow {
  topic: DtmTopicKey;
  events: number;
  futurePlan: number;
  exclusivity: number;
  publicClaim: number;
  hedge: number;
  escape: number;
  commitmentScore: number; // 0..1
  band: 'untested' | 'evasive' | 'tentative' | 'engaged' | 'committed';
}

const INDEX = new Set<string>(DTM_TOPIC_KEYS);
const VALID = new Set<CommitmentSignal>([
  'future-plan',
  'exclusivity',
  'public-claim',
  'hedge',
  'escape-hatch',
]);
const W: Record<CommitmentSignal, number> = {
  'future-plan': 0.7,
  exclusivity: 0.9,
  'public-claim': 1,
  hedge: -0.5,
  'escape-hatch': -0.9,
};

export function summarizeDtmTopicCommitment(
  events: ReadonlyArray<DtmCommitmentEvent>
): DtmTopicCommitmentRow[] {
  const m = new Map<
    DtmTopicKey,
    { fp: number; ex: number; pc: number; he: number; eh: number; sum: number }
  >();
  for (const t of DTM_TOPIC_KEYS) m.set(t, { fp: 0, ex: 0, pc: 0, he: 0, eh: 0, sum: 0 });
  for (const e of events) {
    if (!INDEX.has(e.topic) || !VALID.has(e.signal)) continue;
    const b = m.get(e.topic as DtmTopicKey)!;
    if (e.signal === 'future-plan') b.fp++;
    else if (e.signal === 'exclusivity') b.ex++;
    else if (e.signal === 'public-claim') b.pc++;
    else if (e.signal === 'hedge') b.he++;
    else b.eh++;
    b.sum += W[e.signal];
  }
  const rows: DtmTopicCommitmentRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const { fp, ex, pc, he, eh, sum } = m.get(topic)!;
    const n = fp + ex + pc + he + eh;
    if (n === 0) {
      rows.push({
        topic,
        events: 0,
        futurePlan: 0,
        exclusivity: 0,
        publicClaim: 0,
        hedge: 0,
        escape: 0,
        commitmentScore: 0,
        band: 'untested',
      });
      continue;
    }
    const score = clamp01((sum / n + 1) / 2);
    let band: DtmTopicCommitmentRow['band'];
    if (score >= 0.85) band = 'committed';
    else if (score >= 0.65) band = 'engaged';
    else if (score >= 0.4) band = 'tentative';
    else band = 'evasive';
    rows.push({
      topic,
      events: n,
      futurePlan: fp,
      exclusivity: ex,
      publicClaim: pc,
      hedge: he,
      escape: eh,
      commitmentScore: score,
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

export function evasiveCommitmentDtmTopics(
  rows: ReadonlyArray<DtmTopicCommitmentRow>
): DtmTopicKey[] {
  return rows.filter((r) => r.band === 'evasive').map((r) => r.topic);
}
