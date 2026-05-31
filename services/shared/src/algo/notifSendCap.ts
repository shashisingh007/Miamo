/**
 * notifSendCap \u2014 Phase 17 per-user per-day send cap.
 *
 * Keeps the inbox calm. Given a sliding 24h send log, decide whether a
 * new notification of a given category may go out, and how many minutes
 * to wait if not. Categories carry independent caps so a "match" ping
 * never starves out a "msg.received" ping (or vice-versa).
 *
 * Pure & deterministic.
 */
export type NotifSendEvent = {
  category: string;
  sentAtMs: number;
};

export type NotifSendCapConfig = {
  /** Total notifications across all categories in the rolling window. */
  globalCapPer24h?: number;
  /** Per-category cap (overrides nothing; both must pass). */
  perCategoryCapPer24h?: Record<string, number>;
  /** Minimum minutes between any two sends of the same category. */
  minGapMinutes?: number;
};

export type NotifSendCapDecision =
  | { allowed: true }
  | { allowed: false; reason: 'global' | 'category' | 'minGap'; retryAfterMs: number };

const DEFAULTS = {
  globalCapPer24h: 6,
  minGapMinutes: 30,
};
const WINDOW_MS = 24 * 60 * 60 * 1000;

export function decideNotifSend(
  recent: readonly NotifSendEvent[],
  candidate: { category: string; atMs: number },
  cfg: NotifSendCapConfig = {},
): NotifSendCapDecision {
  const globalCap = cfg.globalCapPer24h ?? DEFAULTS.globalCapPer24h;
  const minGapMs = (cfg.minGapMinutes ?? DEFAULTS.minGapMinutes) * 60_000;
  const perCatCap = cfg.perCategoryCapPer24h?.[candidate.category];

  const inWindow = recent.filter((e) => candidate.atMs - e.sentAtMs < WINDOW_MS && e.sentAtMs <= candidate.atMs);

  if (inWindow.length >= globalCap) {
    const oldest = inWindow.reduce((a, b) => (a.sentAtMs < b.sentAtMs ? a : b));
    const retryAfterMs = Math.max(0, WINDOW_MS - (candidate.atMs - oldest.sentAtMs));
    return { allowed: false, reason: 'global', retryAfterMs };
  }

  if (typeof perCatCap === 'number') {
    const sameCat = inWindow.filter((e) => e.category === candidate.category);
    if (sameCat.length >= perCatCap) {
      const oldest = sameCat.reduce((a, b) => (a.sentAtMs < b.sentAtMs ? a : b));
      const retryAfterMs = Math.max(0, WINDOW_MS - (candidate.atMs - oldest.sentAtMs));
      return { allowed: false, reason: 'category', retryAfterMs };
    }
  }

  const sameCat = inWindow.filter((e) => e.category === candidate.category);
  if (sameCat.length > 0) {
    const newest = sameCat.reduce((a, b) => (a.sentAtMs > b.sentAtMs ? a : b));
    const gap = candidate.atMs - newest.sentAtMs;
    if (gap < minGapMs) {
      return { allowed: false, reason: 'minGap', retryAfterMs: minGapMs - gap };
    }
  }

  return { allowed: true };
}
