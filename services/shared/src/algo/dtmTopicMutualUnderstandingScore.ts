import { DTM_TOPIC_KEYS, DtmTopicKey } from './dtmTopics';

export type DtmComprehensionSignal =
  | 'paraphrase'
  | 'agreement'
  | 'clarification'
  | 'misread'
  | 'silence';

export interface DtmComprehensionEvent {
  topic: string;
  signal: DtmComprehensionSignal;
}

export interface DtmTopicMutualUnderstandingRow {
  topic: DtmTopicKey;
  events: number;
  paraphrase: number;
  agreement: number;
  clarification: number;
  misread: number;
  silence: number;
  understandingScore: number; // 0..1
  band: 'untested' | 'confused' | 'partial' | 'aligned' | 'attuned';
}

const INDEX = new Set<string>(DTM_TOPIC_KEYS);
const VALID = new Set<DtmComprehensionSignal>([
  'paraphrase',
  'agreement',
  'clarification',
  'misread',
  'silence',
]);

// Weights: positive signals add; negative signals subtract.
const WEIGHTS: Record<DtmComprehensionSignal, number> = {
  paraphrase: 1.0,
  agreement: 0.6,
  clarification: 0.2,
  silence: -0.4,
  misread: -1.0,
};

export function summarizeDtmTopicMutualUnderstanding(
  events: ReadonlyArray<DtmComprehensionEvent>
): DtmTopicMutualUnderstandingRow[] {
  const buckets = new Map<
    DtmTopicKey,
    { p: number; a: number; c: number; m: number; s: number }
  >();
  for (const t of DTM_TOPIC_KEYS) buckets.set(t, { p: 0, a: 0, c: 0, m: 0, s: 0 });
  for (const e of events) {
    if (!INDEX.has(e.topic)) continue;
    if (!VALID.has(e.signal)) continue;
    const b = buckets.get(e.topic as DtmTopicKey)!;
    if (e.signal === 'paraphrase') b.p++;
    else if (e.signal === 'agreement') b.a++;
    else if (e.signal === 'clarification') b.c++;
    else if (e.signal === 'misread') b.m++;
    else b.s++;
  }
  const rows: DtmTopicMutualUnderstandingRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const { p, a, c, m, s } = buckets.get(topic)!;
    const n = p + a + c + m + s;
    if (n === 0) {
      rows.push({
        topic,
        events: 0,
        paraphrase: 0,
        agreement: 0,
        clarification: 0,
        misread: 0,
        silence: 0,
        understandingScore: 0,
        band: 'untested',
      });
      continue;
    }
    const weighted =
      WEIGHTS.paraphrase * p +
      WEIGHTS.agreement * a +
      WEIGHTS.clarification * c +
      WEIGHTS.silence * s +
      WEIGHTS.misread * m;
    // Normalise into [0,1] via shift+scale: max possible per-event = 1 (paraphrase),
    // min = -1 (misread). Map [-1,1] -> [0,1].
    const score = clamp01((weighted / n + 1) / 2);
    let band: DtmTopicMutualUnderstandingRow['band'];
    if (score >= 0.9) band = 'attuned';
    else if (score >= 0.7) band = 'aligned';
    else if (score >= 0.45) band = 'partial';
    else band = 'confused';
    rows.push({
      topic,
      events: n,
      paraphrase: p,
      agreement: a,
      clarification: c,
      misread: m,
      silence: s,
      understandingScore: score,
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

export function attunedDtmTopics(
  rows: ReadonlyArray<DtmTopicMutualUnderstandingRow>
): DtmTopicKey[] {
  return rows.filter((r) => r.band === 'attuned' || r.band === 'aligned').map((r) => r.topic);
}
