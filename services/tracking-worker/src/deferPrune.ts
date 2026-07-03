/**
 * DeferredItem pruner — v6.6.
 *
 * Drops `DeferredItem` rows older than DEFER_PRUNE_MAX_AGE_DAYS (default 30).
 * The see-later pile is intentionally short-lived: anything the user hasn't
 * come back to in a month is no longer a meaningful intent signal, and we
 * don't want it inflating list queries or biasing the learner.
 *
 * Default-OFF: set DEFER_PRUNE_ENABLED=1 to start the loop. The pruner
 * is idempotent — running it twice in succession deletes only what
 * crosses the age cutoff.
 */
import type { PrismaClient } from '@prisma/client';

const INTERVAL_MS = Number(process.env.DEFER_PRUNE_INTERVAL_MS || 6 * 60 * 60 * 1000); // 6h
const MAX_AGE_DAYS = Number(process.env.DEFER_PRUNE_MAX_AGE_DAYS || 30);
const ENABLED = process.env.DEFER_PRUNE_ENABLED === '1';

/**
 * Pure helper: compute the cutoff Date given a "now" reference. Anything
 * with `deferredAt < cutoff` AND `resolvedAt = null` (i.e. still pending
 * after the age limit) is eligible for deletion. Resolved rows are kept
 * for a longer audit window — this helper only computes the cutoff for
 * the pending-prune query.
 */
export function computePruneCutoff(now: Date, maxAgeDays: number = MAX_AGE_DAYS): Date {
  const cutoff = new Date(now.getTime());
  cutoff.setUTCDate(cutoff.getUTCDate() - Math.max(1, Math.floor(maxAgeDays)));
  return cutoff;
}

export class DeferPrune {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private prisma: PrismaClient) {}

  start(): void {
    if (!ENABLED) return;
    this.timer = setInterval(() => {
      this.tick().catch((e) => {
        // eslint-disable-next-line no-console
        console.warn('[defer-prune] tick error:', (e as Error).message);
      });
    }, INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async tick(): Promise<{ deleted: number }> {
    const cutoff = computePruneCutoff(new Date());
    const r = await this.prisma.deferredItem.deleteMany({
      where: { resolvedAt: null, deferredAt: { lt: cutoff } },
    });
    return { deleted: r.count };
  }
}

export const _internals = { computePruneCutoff };
