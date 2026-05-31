import { DTM_TOPIC_KEYS, DtmTopicKey } from './dtmTopics';

export interface DtmReciprocityEvent {
  topic: string;
  speaker: 'self' | 'partner';
  kind: 'initiate' | 'respond';
  ts: number;
}

export interface DtmTopicReciprocityRow {
  topic: DtmTopicKey;
  selfInitiates: number;
  partnerInitiates: number;
  selfResponds: number;
  partnerResponds: number;
  reciprocity: number; // 0..1 — 1 = perfectly balanced exchange
  initiationBalance: number; // -1 (partner-only) .. +1 (self-only)
  band: 'one-sided' | 'lopsided' | 'balanced' | 'mutual';
}

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export function summarizeDtmTopicReciprocity(
  events: ReadonlyArray<DtmReciprocityEvent>
): DtmTopicReciprocityRow[] {
  const buckets = new Map<DtmTopicKey, { si: number; pi: number; sr: number; pr: number }>();
  for (const k of DTM_TOPIC_KEYS) buckets.set(k, { si: 0, pi: 0, sr: 0, pr: 0 });
  for (const e of events) {
    if (!INDEX.has(e.topic)) continue;
    const b = buckets.get(e.topic as DtmTopicKey)!;
    if (e.speaker === 'self' && e.kind === 'initiate') b.si++;
    else if (e.speaker === 'partner' && e.kind === 'initiate') b.pi++;
    else if (e.speaker === 'self' && e.kind === 'respond') b.sr++;
    else if (e.speaker === 'partner' && e.kind === 'respond') b.pr++;
  }
  const rows: DtmTopicReciprocityRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const b = buckets.get(topic)!;
    const total = b.si + b.pi + b.sr + b.pr;
    let reciprocity = 0;
    let initiationBalance = 0;
    if (total > 0) {
      const initTotal = b.si + b.pi;
      const respTotal = b.sr + b.pr;
      // reciprocity = how balanced initiator-vs-responder pairing is, both ways
      const selfPair = Math.min(b.si, b.pr); // self initiates, partner responds
      const partnerPair = Math.min(b.pi, b.sr); // partner initiates, self responds
      const pairUpper = Math.max(1, Math.max(initTotal, respTotal));
      reciprocity = (selfPair + partnerPair) / pairUpper;
      if (reciprocity > 1) reciprocity = 1;
      if (initTotal > 0) initiationBalance = (b.si - b.pi) / initTotal;
    }
    let band: DtmTopicReciprocityRow['band'];
    const absBalance = Math.abs(initiationBalance);
    if (total === 0) band = 'one-sided';
    else if (absBalance >= 0.8) band = 'one-sided';
    else if (reciprocity >= 0.75 && absBalance <= 0.25) band = 'mutual';
    else if (reciprocity >= 0.5) band = 'balanced';
    else band = 'lopsided';
    rows.push({
      topic,
      selfInitiates: b.si,
      partnerInitiates: b.pi,
      selfResponds: b.sr,
      partnerResponds: b.pr,
      reciprocity,
      initiationBalance,
      band,
    });
  }
  return rows;
}

export function oneSidedDtmTopics(rows: ReadonlyArray<DtmTopicReciprocityRow>): DtmTopicKey[] {
  return rows.filter((r) => r.band === 'one-sided' && (r.selfInitiates + r.partnerInitiates + r.selfResponds + r.partnerResponds) > 0).map((r) => r.topic);
}
