// ─── v3.5.1 hotfix: hard-filter passed profiles from Discover pool ───
//
// Background: the #1 user complaint globally was "shows me people I already
// passed." The legacy ranker applied a soft penalty and relied on an implicit
// 14-day TTL that did not actually filter passed profiles out of the candidate
// pool. This module exposes a tiny, well-typed helper that returns the set of
// target user-ids the caller has actively passed on within a fixed lookback
// window — to be used as a hard NOT-IN filter on the candidate pool.
//
// Knobs:
//   - DISCOVER_PASS_HARDFILTER_ENABLED: defaults to "1" (on). Set to "0" for
//     emergency rollback without redeploy.
//   - PASS_LOOKBACK_DAYS: 30 (passes older than this re-enter the pool).
//   - PASS_EXCLUSION_CAP: 10_000 (safety bound on the IN clause; users with
//     more than 10k passes in 30d will have their oldest passes "slip through",
//     which is still strictly better than the legacy "all pass-history shown
//     forever" behavior — pragma over perfection).

export const PASS_LOOKBACK_DAYS = 30;
export const PASS_EXCLUSION_CAP = 10_000;

export function isPassHardfilterEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  // Default ON; only "0" disables. Any other value (including undefined) is on.
  return env.DISCOVER_PASS_HARDFILTER_ENABLED !== '0';
}

// Minimal shape we depend on — keeps this helper trivially mockable in tests.
export interface UserActivityFinder {
  findMany(args: {
    where: {
      userId: string;
      action: string;
      createdAt: { gte: Date };
      targetId: { not: null };
    };
    select: { targetId: true };
    distinct: ['targetId'];
    take: number;
  }): Promise<Array<{ targetId: string | null }>>;
}

export interface PrismaForPassFilter {
  userActivity: UserActivityFinder;
}

/**
 * Returns the set of distinct targetIds the user has 'pass'-ed within the last
 * PASS_LOOKBACK_DAYS days, capped at PASS_EXCLUSION_CAP. Returns an empty array
 * when the feature flag is off or on any (caught) error — this is best-effort
 * and must never break Discover.
 */
export async function getRecentPassedTargetIds(
  prisma: PrismaForPassFilter,
  userId: string,
  opts: { now?: Date; env?: NodeJS.ProcessEnv } = {},
): Promise<string[]> {
  if (!isPassHardfilterEnabled(opts.env)) return [];
  const now = opts.now ?? new Date();
  const cutoff = new Date(now.getTime() - PASS_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  try {
    const rows = await prisma.userActivity.findMany({
      where: {
        userId,
        action: 'pass',
        createdAt: { gte: cutoff },
        targetId: { not: null },
      },
      select: { targetId: true },
      distinct: ['targetId'],
      take: PASS_EXCLUSION_CAP,
    });
    const ids: string[] = [];
    for (const r of rows) if (r.targetId) ids.push(r.targetId);
    return ids;
  } catch {
    // Best-effort — never break Discover because of a query error.
    return [];
  }
}
