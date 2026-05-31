export type ThrottleClassification = 'normal' | 'elevated' | 'throttled';

export type ThrottleSample = {
  readonly tsMs: number;
  readonly count: number;
};

export type ThrottleWindowResult = {
  readonly total: number;
  readonly perSec: number;
  readonly classification: ThrottleClassification;
  readonly retryAfterMs: number;
};

export type ThrottleOptions = {
  readonly windowMs: number;
  readonly softLimitPerSec: number;
  readonly hardLimitPerSec: number;
};

function clean(n: number, min = 0): number {
  return Number.isFinite(n) && n >= min ? n : min;
}

export function evaluateThrottleWindow(
  samples: ReadonlyArray<ThrottleSample>,
  nowMs: number,
  opts: ThrottleOptions,
): ThrottleWindowResult {
  const windowMs = Math.max(1, clean(opts.windowMs, 1));
  const soft = Math.max(0, clean(opts.softLimitPerSec, 0));
  const hard = Math.max(soft, clean(opts.hardLimitPerSec, soft));
  const now = clean(nowMs, 0);
  const from = now - windowMs;

  let total = 0;
  for (const s of samples) {
    if (!s) continue;
    const ts = clean(s.tsMs, 0);
    const c = clean(s.count, 0);
    if (ts >= from && ts <= now && c > 0) total += c;
  }

  const perSec = total / (windowMs / 1000);
  let classification: ThrottleClassification = 'normal';
  if (hard > 0 && perSec >= hard) classification = 'throttled';
  else if (soft > 0 && perSec >= soft) classification = 'elevated';

  let retryAfterMs = 0;
  if (classification === 'throttled' && hard > 0) {
    const overshoot = perSec - hard;
    retryAfterMs = Math.ceil(((overshoot + 1) / hard) * 1000);
  }

  return { total, perSec, classification, retryAfterMs };
}

export function trimThrottleSamples(
  samples: ReadonlyArray<ThrottleSample>,
  nowMs: number,
  windowMs: number,
): ThrottleSample[] {
  const w = Math.max(1, clean(windowMs, 1));
  const from = clean(nowMs, 0) - w;
  return samples.filter((s) => s && s.tsMs >= from);
}
