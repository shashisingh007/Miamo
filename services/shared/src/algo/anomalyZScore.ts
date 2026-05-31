export type AnomalyPoint = { readonly tsMs: number; readonly value: number };

export type AnomalyZScoreResult = {
  readonly mean: number;
  readonly stdDev: number;
  readonly z: number;
  readonly isAnomaly: boolean;
  readonly severity: 'normal' | 'minor' | 'major' | 'severe';
};

export type AnomalyZScoreOptions = {
  readonly threshold?: number;
};

function clean(n: number): number | null {
  return Number.isFinite(n) ? n : null;
}

function severityOf(absZ: number, threshold: number): AnomalyZScoreResult['severity'] {
  if (absZ < threshold) return 'normal';
  if (absZ < threshold * 1.5) return 'minor';
  if (absZ < threshold * 2.5) return 'major';
  return 'severe';
}

export function evaluateAnomalyZScore(
  baseline: ReadonlyArray<number>,
  current: number,
  opts: AnomalyZScoreOptions = {},
): AnomalyZScoreResult {
  const threshold = clean(opts.threshold ?? NaN) ?? 3;
  const t = threshold > 0 ? threshold : 3;
  const clean_baseline: number[] = [];
  for (const v of baseline) {
    const c = clean(v);
    if (c !== null) clean_baseline.push(c);
  }
  if (clean_baseline.length < 2 || !Number.isFinite(current)) {
    return { mean: 0, stdDev: 0, z: 0, isAnomaly: false, severity: 'normal' };
  }
  let mean = 0;
  for (const v of clean_baseline) mean += v;
  mean /= clean_baseline.length;
  let acc = 0;
  for (const v of clean_baseline) {
    const d = v - mean;
    acc += d * d;
  }
  const variance = acc / clean_baseline.length;
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) {
    const equal = current === mean;
    return {
      mean,
      stdDev: 0,
      z: equal ? 0 : Infinity,
      isAnomaly: !equal,
      severity: equal ? 'normal' : 'severe',
    };
  }
  const z = (current - mean) / stdDev;
  const absZ = Math.abs(z);
  return {
    mean,
    stdDev,
    z,
    isAnomaly: absZ >= t,
    severity: severityOf(absZ, t),
  };
}
