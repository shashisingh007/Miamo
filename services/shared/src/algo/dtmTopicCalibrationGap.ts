import { DTM_TOPIC_KEYS, DtmTopicKey } from './dtmTopics';

export interface DtmCalibrationSample {
  topic: string;
  predicted: number; // expected agreement, 0..1
  observed: 0 | 1; // 1 = actually agreed, 0 = disagreed
}

export interface DtmTopicCalibrationRow {
  topic: DtmTopicKey;
  samples: number;
  meanPredicted: number;
  meanObserved: number;
  gap: number; // observed - predicted (signed)
  brier: number; // mean squared error (0..1)
  band: 'untested' | 'calibrated' | 'underconfident' | 'overconfident';
}

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export interface DtmTopicCalibrationOptions {
  tolerance?: number; // |gap| <= tolerance => calibrated. Default 0.1
}

export function summarizeDtmTopicCalibration(
  samples: ReadonlyArray<DtmCalibrationSample>,
  opts: DtmTopicCalibrationOptions = {}
): DtmTopicCalibrationRow[] {
  const tol = opts.tolerance ?? 0.1;
  if (tol < 0 || tol > 1) throw new Error('tolerance must be in [0,1]');
  const buckets = new Map<DtmTopicKey, { p: number; o: number; sq: number; n: number }>();
  for (const t of DTM_TOPIC_KEYS) buckets.set(t, { p: 0, o: 0, sq: 0, n: 0 });
  for (const s of samples) {
    if (!INDEX.has(s.topic)) continue;
    if (!Number.isFinite(s.predicted) || s.predicted < 0 || s.predicted > 1) continue;
    if (s.observed !== 0 && s.observed !== 1) continue;
    const b = buckets.get(s.topic as DtmTopicKey)!;
    b.p += s.predicted;
    b.o += s.observed;
    b.sq += (s.predicted - s.observed) ** 2;
    b.n += 1;
  }
  const rows: DtmTopicCalibrationRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const b = buckets.get(topic)!;
    if (b.n === 0) {
      rows.push({
        topic,
        samples: 0,
        meanPredicted: 0,
        meanObserved: 0,
        gap: 0,
        brier: 0,
        band: 'untested',
      });
      continue;
    }
    const meanPredicted = b.p / b.n;
    const meanObserved = b.o / b.n;
    const gap = meanObserved - meanPredicted;
    const brier = b.sq / b.n;
    let band: DtmTopicCalibrationRow['band'];
    if (Math.abs(gap) <= tol) band = 'calibrated';
    else if (gap > 0) band = 'underconfident';
    else band = 'overconfident';
    rows.push({ topic, samples: b.n, meanPredicted, meanObserved, gap, brier, band });
  }
  return rows;
}

export function miscalibratedDtmTopics(
  rows: ReadonlyArray<DtmTopicCalibrationRow>
): DtmTopicKey[] {
  return rows
    .filter((r) => r.band === 'overconfident' || r.band === 'underconfident')
    .map((r) => r.topic);
}
