/**
 * quotaEnforcer \u2014 Phase 9/11 daily per-actor quota tracker (pure).
 *
 * Tracks consumed units against a daily ceiling that auto-resets at the
 * configured local-day boundary (UTC by default). Suitable for likes-
 * per-day, invites-per-day, message-send caps. State is JSON-serialisable.
 */
export type QuotaState = {
  dayKey: string;   // 'YYYY-MM-DD' bucket id
  used: number;
};

export type QuotaCheck = {
  allowed: boolean;
  remaining: number;
  next: QuotaState;
  resetAtMs: number;
  reason?: 'exceeded' | 'invalid_cost';
};

function dayKeyFromMs(ms: number, tzOffsetMinutes: number): string {
  const shifted = new Date(ms + tzOffsetMinutes * 60_000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function nextResetMs(ms: number, tzOffsetMinutes: number): number {
  const shifted = new Date(ms + tzOffsetMinutes * 60_000);
  shifted.setUTCHours(24, 0, 0, 0);
  return shifted.getTime() - tzOffsetMinutes * 60_000;
}

export function initQuota(nowMs: number, tzOffsetMinutes = 0): QuotaState {
  return { dayKey: dayKeyFromMs(nowMs, tzOffsetMinutes), used: 0 };
}

export function checkQuota(
  prev: QuotaState | null | undefined,
  opts: { nowMs: number; dailyLimit: number; cost?: number; tzOffsetMinutes?: number },
): QuotaCheck {
  const tz = opts.tzOffsetMinutes ?? 0;
  const limit = Math.max(0, opts.dailyLimit);
  const cost = opts.cost ?? 1;
  const resetAtMs = nextResetMs(opts.nowMs, tz);
  const key = dayKeyFromMs(opts.nowMs, tz);

  if (!Number.isFinite(cost) || cost < 0) {
    return { allowed: false, remaining: limit, next: prev ?? initQuota(opts.nowMs, tz), resetAtMs, reason: 'invalid_cost' };
  }

  const used = prev && prev.dayKey === key ? prev.used : 0;
  if (used + cost > limit) {
    return {
      allowed: false,
      remaining: Math.max(0, limit - used),
      next: { dayKey: key, used },
      resetAtMs,
      reason: 'exceeded',
    };
  }
  const nextUsed = used + cost;
  return {
    allowed: true,
    remaining: limit - nextUsed,
    next: { dayKey: key, used: nextUsed },
    resetAtMs,
  };
}
