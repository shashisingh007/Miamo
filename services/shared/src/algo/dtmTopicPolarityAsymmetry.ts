import { DTM_TOPIC_KEYS, DtmTopicKey } from './dtmTopics';

export interface DtmPolaritySample {
  topic: string;
  valence: number; // -1..1
}

export interface DtmTopicPolarityAsymmetryRow {
  topic: DtmTopicKey;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  asymmetry: number; // (pos - neg) / max(1, pos + neg), range [-1, 1]
  band: 'untested' | 'negative' | 'mixed' | 'balanced' | 'positive';
}

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export interface DtmPolarityAsymmetryOptions {
  positiveThreshold?: number; // default 0.2
  negativeThreshold?: number; // default -0.2
}

export function summarizeDtmTopicPolarityAsymmetry(
  samples: ReadonlyArray<DtmPolaritySample>,
  opts: DtmPolarityAsymmetryOptions = {}
): DtmTopicPolarityAsymmetryRow[] {
  const posT = opts.positiveThreshold ?? 0.2;
  const negT = opts.negativeThreshold ?? -0.2;
  if (!(posT > negT)) throw new Error('positiveThreshold must be greater than negativeThreshold');

  const buckets = new Map<DtmTopicKey, { p: number; n: number; z: number }>();
  for (const t of DTM_TOPIC_KEYS) buckets.set(t, { p: 0, n: 0, z: 0 });
  for (const s of samples) {
    if (!INDEX.has(s.topic)) continue;
    if (typeof s.valence !== 'number' || !Number.isFinite(s.valence)) continue;
    const b = buckets.get(s.topic as DtmTopicKey)!;
    if (s.valence >= posT) b.p++;
    else if (s.valence <= negT) b.n++;
    else b.z++;
  }
  const rows: DtmTopicPolarityAsymmetryRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const { p, n, z } = buckets.get(topic)!;
    const total = p + n + z;
    if (total === 0) {
      rows.push({
        topic,
        positiveCount: 0,
        negativeCount: 0,
        neutralCount: 0,
        asymmetry: 0,
        band: 'untested',
      });
      continue;
    }
    const denom = p + n === 0 ? 1 : p + n;
    const asymmetry = (p - n) / denom;
    let band: DtmTopicPolarityAsymmetryRow['band'];
    if (p + n === 0) band = 'mixed';
    else if (asymmetry >= 0.6) band = 'positive';
    else if (asymmetry <= -0.6) band = 'negative';
    else if (Math.abs(asymmetry) <= 0.2) band = 'balanced';
    else band = 'mixed';
    rows.push({
      topic,
      positiveCount: p,
      negativeCount: n,
      neutralCount: z,
      asymmetry,
      band,
    });
  }
  return rows;
}

export function negativeLeaningDtmTopics(
  rows: ReadonlyArray<DtmTopicPolarityAsymmetryRow>
): DtmTopicKey[] {
  return rows.filter((r) => r.band === 'negative').map((r) => r.topic);
}
