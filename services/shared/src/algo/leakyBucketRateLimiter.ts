// Pure leaky bucket rate limiter.
// Bucket holds at most `capacity` units. Leaks at `leakRatePerMs`.
// Each request adds `cost` units (default 1). Allowed when bucket would not overflow.

export interface LeakyBucketConfig {
  capacity: number;
  leakRatePerMs: number; // units leaked per ms (e.g. 0.1 = 1 unit per 10ms)
}

export interface LeakyBucketState {
  level: number;
  lastTs: number;
}

export interface LeakyBucketDecision {
  allowed: boolean;
  state: LeakyBucketState;
  retryAfterMs: number; // 0 when allowed
}

function validate(cfg: LeakyBucketConfig): void {
  if (!Number.isFinite(cfg.capacity) || cfg.capacity <= 0) {
    throw new Error('capacity must be a positive finite number');
  }
  if (!Number.isFinite(cfg.leakRatePerMs) || cfg.leakRatePerMs <= 0) {
    throw new Error('leakRatePerMs must be a positive finite number');
  }
}

export function initLeakyBucket(initialLevel = 0, initialTs = 0): LeakyBucketState {
  if (!Number.isFinite(initialLevel) || initialLevel < 0) {
    throw new Error('initialLevel must be non-negative finite');
  }
  if (!Number.isFinite(initialTs)) throw new Error('initialTs must be finite');
  return { level: initialLevel, lastTs: initialTs };
}

export function leakyBucketAdmit(
  state: LeakyBucketState,
  cfg: LeakyBucketConfig,
  nowMs: number,
  cost = 1
): LeakyBucketDecision {
  validate(cfg);
  if (!Number.isFinite(nowMs)) throw new Error('nowMs must be finite');
  if (!Number.isFinite(cost) || cost <= 0) throw new Error('cost must be positive finite');

  const elapsed = Math.max(0, nowMs - state.lastTs);
  const leaked = elapsed * cfg.leakRatePerMs;
  const drained = Math.max(0, state.level - leaked);

  if (drained + cost <= cfg.capacity) {
    return {
      allowed: true,
      state: { level: drained + cost, lastTs: nowMs },
      retryAfterMs: 0,
    };
  }
  const overflow = drained + cost - cfg.capacity;
  const retryAfterMs = Math.ceil(overflow / cfg.leakRatePerMs);
  return {
    allowed: false,
    state: { level: drained, lastTs: nowMs },
    retryAfterMs,
  };
}

export function leakyBucketHeadroom(
  state: LeakyBucketState,
  cfg: LeakyBucketConfig,
  nowMs: number
): number {
  validate(cfg);
  const elapsed = Math.max(0, nowMs - state.lastTs);
  const drained = Math.max(0, state.level - elapsed * cfg.leakRatePerMs);
  return Math.max(0, cfg.capacity - drained);
}
