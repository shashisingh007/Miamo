import { DTM_TOPIC_KEYS, DtmTopicKey } from './dtmTopics';

// Measures emotional-labor balance per topic between partners.
export type EmotionalLaborKind =
  | 'planning'
  | 'scheduling'
  | 'remembering'
  | 'soothing'
  | 'mediating'
  | 'tracking';

export interface DtmEmotionalLaborEvent {
  topic: string;
  by: 'self' | 'partner';
  kind: EmotionalLaborKind;
  weight?: number; // default 1
}

export interface DtmTopicEmotionalLaborRow {
  topic: DtmTopicKey;
  selfWeight: number;
  partnerWeight: number;
  totalWeight: number;
  selfShare: number; // self / total, 0..1
  balanceScore: number; // 1 - |2*selfShare - 1|, 1 == perfect 50/50
  band:
    | 'untested'
    | 'partner-overloaded'
    | 'partner-leaning'
    | 'balanced'
    | 'self-leaning'
    | 'self-overloaded';
}

const INDEX = new Set<string>(DTM_TOPIC_KEYS);
const VALID = new Set<EmotionalLaborKind>([
  'planning',
  'scheduling',
  'remembering',
  'soothing',
  'mediating',
  'tracking',
]);

export function summarizeDtmTopicEmotionalLabor(
  events: ReadonlyArray<DtmEmotionalLaborEvent>
): DtmTopicEmotionalLaborRow[] {
  const m = new Map<DtmTopicKey, { self: number; partner: number }>();
  for (const t of DTM_TOPIC_KEYS) m.set(t, { self: 0, partner: 0 });
  for (const e of events) {
    if (!INDEX.has(e.topic) || !VALID.has(e.kind)) continue;
    if (e.by !== 'self' && e.by !== 'partner') continue;
    const w = e.weight ?? 1;
    if (!Number.isFinite(w) || w < 0) continue;
    const b = m.get(e.topic as DtmTopicKey)!;
    if (e.by === 'self') b.self += w;
    else b.partner += w;
  }
  const rows: DtmTopicEmotionalLaborRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const { self, partner } = m.get(topic)!;
    const total = self + partner;
    if (total === 0) {
      rows.push({
        topic,
        selfWeight: 0,
        partnerWeight: 0,
        totalWeight: 0,
        selfShare: 0,
        balanceScore: 0,
        band: 'untested',
      });
      continue;
    }
    const share = self / total;
    const balance = 1 - Math.abs(2 * share - 1);
    let band: DtmTopicEmotionalLaborRow['band'];
    if (share >= 0.85) band = 'self-overloaded';
    else if (share >= 0.65) band = 'self-leaning';
    else if (share >= 0.35) band = 'balanced';
    else if (share >= 0.15) band = 'partner-leaning';
    else band = 'partner-overloaded';
    rows.push({
      topic,
      selfWeight: self,
      partnerWeight: partner,
      totalWeight: total,
      selfShare: share,
      balanceScore: balance,
      band,
    });
  }
  return rows;
}

export function overloadedEmotionalLaborDtmTopics(
  rows: ReadonlyArray<DtmTopicEmotionalLaborRow>
): DtmTopicKey[] {
  return rows
    .filter((r) => r.band === 'self-overloaded' || r.band === 'partner-overloaded')
    .map((r) => r.topic);
}
