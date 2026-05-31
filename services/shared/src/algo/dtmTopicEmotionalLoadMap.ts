import { DTM_TOPIC_KEYS, type DtmTopicKey } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export interface DtmTopicLoadSample {
  topic: string;
  /** self rating in [-1, 1] */
  self: number;
  /** partner rating in [-1, 1] */
  partner: number;
  /** optional conflict flag — true when this exchange involved a disagreement */
  conflict?: boolean;
}

export type DtmEmotionalLoadBand = 'light' | 'moderate' | 'heavy' | 'critical';

export interface DtmTopicEmotionalLoadRow {
  topic: DtmTopicKey;
  samples: number;
  /** mean intensity = (|self|+|partner|)/2 */
  intensity: number;
  /** mean polarity gap = |self-partner|/2 */
  gap: number;
  /** fraction of samples flagged as conflict */
  conflictRate: number;
  /** load = 0.4*intensity + 0.3*gap + 0.3*conflictRate, in [0,1] */
  load: number;
  band: DtmEmotionalLoadBand;
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

function bandOf(load: number): DtmEmotionalLoadBand {
  if (load < 0.25) return 'light';
  if (load < 0.55) return 'moderate';
  if (load < 0.8) return 'heavy';
  return 'critical';
}

export function mapDtmTopicEmotionalLoad(
  samples: readonly DtmTopicLoadSample[]
): DtmTopicEmotionalLoadRow[] {
  type Bucket = { intensity: number; gap: number; conflicts: number; n: number };
  const buckets = new Map<string, Bucket>();
  for (const s of samples) {
    if (!s || !INDEX.has(s.topic)) continue;
    if (
      typeof s.self !== 'number' ||
      typeof s.partner !== 'number' ||
      !Number.isFinite(s.self) ||
      !Number.isFinite(s.partner)
    )
      continue;
    const self = clamp(s.self, -1, 1);
    const partner = clamp(s.partner, -1, 1);
    let b = buckets.get(s.topic);
    if (!b) {
      b = { intensity: 0, gap: 0, conflicts: 0, n: 0 };
      buckets.set(s.topic, b);
    }
    b.intensity += (Math.abs(self) + Math.abs(partner)) / 2;
    b.gap += Math.abs(self - partner) / 2;
    if (s.conflict === true) b.conflicts++;
    b.n++;
  }
  const rows: DtmTopicEmotionalLoadRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const b = buckets.get(topic);
    if (!b || b.n === 0) continue;
    const intensity = b.intensity / b.n;
    const gap = b.gap / b.n;
    const conflictRate = b.conflicts / b.n;
    const load = clamp(0.4 * intensity + 0.3 * gap + 0.3 * conflictRate, 0, 1);
    rows.push({
      topic,
      samples: b.n,
      intensity,
      gap,
      conflictRate,
      load,
      band: bandOf(load),
    });
  }
  return rows;
}

export function topDtmEmotionalLoadTopics(
  rows: readonly DtmTopicEmotionalLoadRow[],
  k: number
): DtmTopicEmotionalLoadRow[] {
  if (!Number.isFinite(k) || k <= 0) return [];
  return [...rows]
    .sort((a, b) => b.load - a.load)
    .slice(0, Math.floor(k));
}
