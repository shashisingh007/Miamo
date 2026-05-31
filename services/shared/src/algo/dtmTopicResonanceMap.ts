import { DTM_TOPIC_KEYS, type DtmTopicKey } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export interface DtmTopicPairRating {
  topic: string;
  self: number;
  partner: number;
}

export type DtmResonanceBand =
  | 'shared_passion'
  | 'shared_mild'
  | 'one_sided'
  | 'shared_indifference'
  | 'conflict';

export interface DtmTopicResonanceRow {
  topic: DtmTopicKey;
  self: number;
  partner: number;
  /** mean intensity = (|self| + |partner|) / 2 in [0,1] */
  intensity: number;
  /** agreement = 1 - |self - partner| / 2 in [0,1] */
  agreement: number;
  /** resonance = agreement * intensity * sign(meanPolarity) in [-1,1] */
  resonance: number;
  band: DtmResonanceBand;
}

const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;

function bandOf(
  agreement: number,
  intensity: number,
  meanPolarity: number
): DtmResonanceBand {
  if (agreement < 0.5) return 'conflict';
  if (intensity < 0.2) return 'shared_indifference';
  if (agreement < 0.75) return 'one_sided';
  if (intensity >= 0.6 && meanPolarity > 0) return 'shared_passion';
  return 'shared_mild';
}

export function mapDtmTopicResonance(
  pairs: readonly DtmTopicPairRating[]
): DtmTopicResonanceRow[] {
  const map = new Map<string, DtmTopicPairRating>();
  for (const p of pairs) {
    if (!p || !INDEX.has(p.topic)) continue;
    if (
      typeof p.self !== 'number' ||
      typeof p.partner !== 'number' ||
      !Number.isFinite(p.self) ||
      !Number.isFinite(p.partner)
    )
      continue;
    map.set(p.topic, {
      topic: p.topic,
      self: clamp(p.self, -1, 1),
      partner: clamp(p.partner, -1, 1),
    });
  }
  const rows: DtmTopicResonanceRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const r = map.get(topic);
    if (!r) continue;
    const intensity = (Math.abs(r.self) + Math.abs(r.partner)) / 2;
    const agreement = 1 - Math.abs(r.self - r.partner) / 2;
    const meanPolarity = (r.self + r.partner) / 2;
    const sign = meanPolarity === 0 ? 0 : meanPolarity > 0 ? 1 : -1;
    const resonance = agreement * intensity * sign;
    rows.push({
      topic,
      self: r.self,
      partner: r.partner,
      intensity,
      agreement,
      resonance,
      band: bandOf(agreement, intensity, meanPolarity),
    });
  }
  return rows;
}

export function topDtmResonanceTopics(
  rows: readonly DtmTopicResonanceRow[],
  k: number
): DtmTopicResonanceRow[] {
  if (!Number.isFinite(k) || k <= 0) return [];
  return [...rows]
    .sort((a, b) => b.resonance - a.resonance)
    .slice(0, Math.floor(k));
}
