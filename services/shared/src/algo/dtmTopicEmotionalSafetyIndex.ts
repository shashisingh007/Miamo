import { DTM_TOPIC_KEYS, DtmTopicKey } from './dtmTopics';

export interface DtmSafetySample {
  topic: string;
  valence: number; // -1..1
  interruptions?: number; // 0..N
  repairCount?: number; // attempts at repair within thread
  rupture?: boolean;
}

export interface DtmTopicSafetyRow {
  topic: DtmTopicKey;
  samples: number;
  meanValence: number;
  interruptionRate: number; // interruptions per sample
  ruptureRate: number; // ruptures / samples
  repairRate: number; // repairs / max(1, ruptures)
  safetyScore: number; // 0..1 (1 = very safe)
  band: 'untested' | 'unsafe' | 'guarded' | 'safe' | 'sanctuary';
}

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}
function clampN1(v: number): number {
  if (v < -1) return -1;
  if (v > 1) return 1;
  return v;
}

export function summarizeDtmTopicEmotionalSafety(
  samples: ReadonlyArray<DtmSafetySample>
): DtmTopicSafetyRow[] {
  const buckets = new Map<
    DtmTopicKey,
    { n: number; vSum: number; intr: number; rupt: number; rep: number }
  >();
  for (const t of DTM_TOPIC_KEYS) buckets.set(t, { n: 0, vSum: 0, intr: 0, rupt: 0, rep: 0 });
  for (const s of samples) {
    if (!INDEX.has(s.topic)) continue;
    if (typeof s.valence !== 'number' || !Number.isFinite(s.valence)) continue;
    const b = buckets.get(s.topic as DtmTopicKey)!;
    b.n++;
    b.vSum += clampN1(s.valence);
    if (Number.isFinite(s.interruptions) && (s.interruptions as number) > 0) b.intr += s.interruptions as number;
    if (s.rupture === true) b.rupt++;
    if (Number.isFinite(s.repairCount) && (s.repairCount as number) > 0) b.rep += s.repairCount as number;
  }
  const rows: DtmTopicSafetyRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const { n, vSum, intr, rupt, rep } = buckets.get(topic)!;
    if (n === 0) {
      rows.push({
        topic,
        samples: 0,
        meanValence: 0,
        interruptionRate: 0,
        ruptureRate: 0,
        repairRate: 0,
        safetyScore: 0,
        band: 'untested',
      });
      continue;
    }
    const meanValence = vSum / n;
    const interruptionRate = intr / n;
    const ruptureRate = rupt / n;
    const repairRate = rupt === 0 ? 1 : Math.min(1, rep / rupt);
    // Compose safety: valence (50%), repairRate (20%), inv(rupture) (20%), inv(interruption) (10%)
    const valenceScore = clamp01((meanValence + 1) / 2);
    const ruptureInv = 1 - clamp01(ruptureRate);
    const interruptionInv = 1 - clamp01(Math.min(1, interruptionRate / 3));
    const safetyScore = clamp01(
      0.5 * valenceScore + 0.2 * repairRate + 0.2 * ruptureInv + 0.1 * interruptionInv
    );
    let band: DtmTopicSafetyRow['band'];
    if (safetyScore >= 0.9) band = 'sanctuary';
    else if (safetyScore >= 0.7) band = 'safe';
    else if (safetyScore >= 0.45) band = 'guarded';
    else band = 'unsafe';
    rows.push({
      topic,
      samples: n,
      meanValence,
      interruptionRate,
      ruptureRate,
      repairRate,
      safetyScore,
      band,
    });
  }
  return rows;
}

export function unsafeDtmTopics(
  rows: ReadonlyArray<DtmTopicSafetyRow>
): DtmTopicKey[] {
  return rows.filter((r) => r.band === 'unsafe' || r.band === 'guarded').map((r) => r.topic);
}
