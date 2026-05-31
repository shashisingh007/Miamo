import { DTM_TOPIC_KEYS, DtmTopicKey } from './dtmTopics';

export type BoundarySignal =
  | 'explicit-yes'
  | 'explicit-no'
  | 'qualified-yes'
  | 'qualified-no'
  | 'avoidant'
  | 'reversed';

export interface DtmBoundaryEvent {
  topic: string;
  signal: BoundarySignal;
}

export interface DtmTopicBoundaryClarityRow {
  topic: DtmTopicKey;
  events: number;
  explicit: number;
  qualified: number;
  avoidant: number;
  reversed: number;
  clarityScore: number; // 0..1
  band: 'untested' | 'foggy' | 'mixed' | 'clear' | 'crystalline';
}

const INDEX = new Set<string>(DTM_TOPIC_KEYS);
const VALID = new Set<BoundarySignal>([
  'explicit-yes',
  'explicit-no',
  'qualified-yes',
  'qualified-no',
  'avoidant',
  'reversed',
]);

// Weights: explicit consent answers reinforce clarity; reversals & avoidance erode it.
const WEIGHTS: Record<BoundarySignal, number> = {
  'explicit-yes': 1.0,
  'explicit-no': 1.0,
  'qualified-yes': 0.4,
  'qualified-no': 0.4,
  avoidant: -0.6,
  reversed: -1.0,
};

export function summarizeDtmTopicBoundaryClarity(
  events: ReadonlyArray<DtmBoundaryEvent>
): DtmTopicBoundaryClarityRow[] {
  const buckets = new Map<
    DtmTopicKey,
    { e: number; q: number; a: number; r: number; sum: number; n: number }
  >();
  for (const t of DTM_TOPIC_KEYS) buckets.set(t, { e: 0, q: 0, a: 0, r: 0, sum: 0, n: 0 });
  for (const ev of events) {
    if (!INDEX.has(ev.topic) || !VALID.has(ev.signal)) continue;
    const b = buckets.get(ev.topic as DtmTopicKey)!;
    if (ev.signal === 'explicit-yes' || ev.signal === 'explicit-no') b.e++;
    else if (ev.signal === 'qualified-yes' || ev.signal === 'qualified-no') b.q++;
    else if (ev.signal === 'avoidant') b.a++;
    else b.r++;
    b.sum += WEIGHTS[ev.signal];
    b.n++;
  }
  const rows: DtmTopicBoundaryClarityRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const { e, q, a, r, sum, n } = buckets.get(topic)!;
    if (n === 0) {
      rows.push({
        topic,
        events: 0,
        explicit: 0,
        qualified: 0,
        avoidant: 0,
        reversed: 0,
        clarityScore: 0,
        band: 'untested',
      });
      continue;
    }
    const score = clamp01((sum / n + 1) / 2);
    let band: DtmTopicBoundaryClarityRow['band'];
    if (score >= 0.9) band = 'crystalline';
    else if (score >= 0.7) band = 'clear';
    else if (score >= 0.45) band = 'mixed';
    else band = 'foggy';
    rows.push({
      topic,
      events: n,
      explicit: e,
      qualified: q,
      avoidant: a,
      reversed: r,
      clarityScore: score,
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

export function foggyBoundaryDtmTopics(
  rows: ReadonlyArray<DtmTopicBoundaryClarityRow>
): DtmTopicKey[] {
  return rows.filter((r) => r.band === 'foggy').map((r) => r.topic);
}
