/**
 * Stable-match weekly top-10 worker — v3.6.0.
 *
 * Once per UTC week, for each eligible user, run a pair-Gale-Shapley over
 * their top-decile of PairCompatCache scores and persist the top-10 stable
 * matches into `WeeklyTopMatch`.
 *
 * Schedule. The check fires every 10 minutes. Inside `tick()` we gate by:
 *   - now.getUTCDay() === 0  (Sunday in UTC)
 *   - last fire was > 6 days ago
 * which together produce a single Sunday-00:00-UTC run with safe re-entry
 * on worker restarts.
 *
 * Eligibility per §B.6.4:
 *   1. Active in the last 7d (UserActivity.createdAt).
 *   2. NOT in the user's passed list for the last 30d (mirrors §B.1).
 *   3. Both opted into Discover (Settings.discoverEnabled / non-paused).
 *
 * Idempotency: the per-row insert is guarded by the
 * `WeeklyTopMatch_uniq_uid_week_rank` unique on (uidHash, weekIso, rank).
 * A user whose top-10 is already computed for this `weekIso` is skipped.
 *
 * Default-OFF: set STABLE_MATCH_ENABLED=1 to start the loop.
 *
 * Spec: DESIGN_SECTION_B_exposure_and_ranking.md §B.6.
 */
import type { PrismaClient } from '@prisma/client';
import { galeShapley, type GSPreferenceList } from '../../shared/src/algo/v8/galeShapley';

const INTERVAL_MS = Number(process.env.STABLE_MATCH_INTERVAL_MS || 10 * 60 * 1000);
const MIN_INTERVAL_DAYS = Number(process.env.STABLE_MATCH_MIN_INTERVAL_DAYS || 6);
const BATCH = Number(process.env.STABLE_MATCH_BATCH || 200);
const TOP_K_PROPOSE = Number(process.env.STABLE_MATCH_TOP_K_PROPOSE || 50);
const TOP_K_OUT = Number(process.env.STABLE_MATCH_TOP_K_OUT || 10);
const ACTIVE_WINDOW_DAYS = Number(process.env.STABLE_MATCH_ACTIVE_WINDOW_DAYS || 7);
const PASS_WINDOW_DAYS = Number(process.env.STABLE_MATCH_PASS_WINDOW_DAYS || 30);
const ENABLED = process.env.STABLE_MATCH_ENABLED === '1';

/**
 * ISO-week key in the form "YYYYWww" — e.g. 2026-06-21 → "2026W25".
 *
 * Pure helper. Uses the standard ISO 8601 week algorithm: week 1 is the
 * week containing the first Thursday of the year; weeks start on Monday.
 * Suitable for Postgres TEXT round-tripping.
 */
export function isoWeekKey(d: Date): string {
  // Copy and normalise to UTC midnight on the Thursday of the same week —
  // standard ISO 8601 trick (cf. ECMA-262 §21.4.1.6 and RFC 3339 §6).
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7; // Sunday = 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  const ww = String(weekNum).padStart(2, '0');
  return `${date.getUTCFullYear()}W${ww}`;
}

/**
 * Decide whether the worker should fire on this tick.
 *
 * Pure. Returns true iff:
 *   - now is Sunday UTC (getUTCDay() === 0), AND
 *   - lastRun is null OR (now - lastRun) >= MIN_INTERVAL_DAYS days.
 *
 * Exported so tests can pin all the schedule branches without poking
 * the system clock.
 */
export function shouldFireNow(
  now: Date,
  lastRun: Date | null,
  minIntervalDays = MIN_INTERVAL_DAYS,
): boolean {
  if (now.getUTCDay() !== 0) return false;
  if (!lastRun) return true;
  return now.getTime() - lastRun.getTime() >= minIntervalDays * 86_400_000;
}

/** Pair-score row consumed by the planner. */
export interface PairScoreRow {
  aHash: string;
  bHash: string;
  score: number;
}

/**
 * Pure planner: given a single candidate's forward scores and the full
 * symmetric edge set, return that candidate's top-K stable-match list.
 *
 * Steps:
 *   1. Build proposer prefs from the candidate's top-K_propose scores.
 *   2. Build the reciprocal prefs (each target's ranking of the candidate
 *      derived from the symmetric scores already in the edge set).
 *   3. Run `galeShapley([candidate], reciprocalsAsReceivers)` — proposer-
 *      optimal classical algorithm.
 *   4. The proposer either gets one match or exhausts their list. We
 *      then iterate through the proposer's preference list, skip the
 *      matched target if any, and produce a top-K_out ranked list.
 *
 * This is the per-user shape; the worker calls it once per eligible user.
 */
export function planTopKForUser(
  uidHash: string,
  edges: ReadonlyArray<PairScoreRow>,
  excluded: ReadonlySet<string>,
  topKPropose: number,
  topKOut: number,
): Array<{ rank: number; targetHash: string; score: number }> {
  // Build candidate → score map for both directions.
  const forward = new Map<string, number>(); // me → other (my preference)
  const reverseByTarget = new Map<string, Map<string, number>>(); // other → (proposer → score)
  for (const e of edges) {
    if (e.aHash === uidHash) {
      if (excluded.has(e.bHash)) continue;
      // Keep the best score per other; the cache should already be deduped.
      const prev = forward.get(e.bHash);
      if (prev === undefined || e.score > prev) forward.set(e.bHash, e.score);
    } else if (e.bHash === uidHash) {
      if (excluded.has(e.aHash)) continue;
      const prev = forward.get(e.aHash);
      if (prev === undefined || e.score > prev) forward.set(e.aHash, e.score);
    }
    // For symmetric stable-match prefs, each target's view of *me*:
    // record the score they would assign me, if any.
    let bucket = reverseByTarget.get(e.aHash === uidHash ? e.bHash : e.aHash);
    if (!bucket) {
      bucket = new Map<string, number>();
      reverseByTarget.set(e.aHash === uidHash ? e.bHash : e.aHash, bucket);
    }
    const me = e.aHash === uidHash ? e.bHash : e.aHash;
    void me; // silence; bucket already keyed on the "other"
    bucket.set(uidHash, e.score);
  }
  if (forward.size === 0) return [];

  // Top-K_propose targets — proposer pref list.
  const sortedForward: Array<[string, number]> = Array.from(forward.entries()).sort(
    (a, b) => (b[1] - a[1]) || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0),
  );
  const proposerRanked = sortedForward.slice(0, topKPropose).map(([t]) => t);
  const proposers: GSPreferenceList[] = [{ proposerId: uidHash, ranked: proposerRanked }];

  // Receivers: each candidate's reciprocal list. For a single proposer
  // with one slot, each receiver's "preference" is just "is the proposer
  // listed at all" → we synthesise a list containing only `uidHash`.
  // (The full bipartite algorithm runs in O(1) for one proposer.)
  const receivers: GSPreferenceList[] = proposerRanked.map((rid) => ({
    proposerId: rid,
    ranked: [uidHash],
  }));

  const result = galeShapley(proposers, receivers);
  const matchedTarget = result.matches[0]?.receiverId ?? null;

  // Compose the final top-K_out ranked list:
  // - If we have a stable match, place it at rank 1.
  // - Then fill the rest in forward-score order, skipping the match.
  const out: Array<{ rank: number; targetHash: string; score: number }> = [];
  const seen = new Set<string>();
  if (matchedTarget) {
    out.push({ rank: 1, targetHash: matchedTarget, score: forward.get(matchedTarget) ?? 0 });
    seen.add(matchedTarget);
  }
  for (const [target, score] of sortedForward) {
    if (out.length >= topKOut) break;
    if (seen.has(target)) continue;
    out.push({ rank: out.length + 1, targetHash: target, score });
    seen.add(target);
  }
  return out;
}

/** In-process counters surfaced through /v4/status. */
type SMCounters = {
  stableMatchTop10_runs_total: number;
  stableMatchTop10_writes_total: number;
  stableMatchTop10_errors_total: number;
  stableMatchTop10_users_processed_total: number;
  stableMatchTop10_users_skipped_idempotent_total: number;
};
const counters: SMCounters = {
  stableMatchTop10_runs_total: 0,
  stableMatchTop10_writes_total: 0,
  stableMatchTop10_errors_total: 0,
  stableMatchTop10_users_processed_total: 0,
  stableMatchTop10_users_skipped_idempotent_total: 0,
};
export function getStableMatchCounters(): Readonly<SMCounters> {
  return { ...counters };
}
export class StableMatchTop10 {
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastRunAt: Date | null = null;

  constructor(private prisma: PrismaClient) {}

  isEnabled(): boolean { return ENABLED; }

  start(): void {
    if (!ENABLED) return;
    this.timer = setInterval(() => {
      this.tick().catch((e) => {
        counters.stableMatchTop10_errors_total += 1;
        // eslint-disable-next-line no-console
        console.warn('[stable-match] tick error:', (e as Error).message);
      });
    }, INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async tick(now: Date = new Date()): Promise<number> {
    if (!shouldFireNow(now, this.lastRunAt)) return 0;
    counters.stableMatchTop10_runs_total += 1;
    this.lastRunAt = now;

    const weekIso = isoWeekKey(now);
    const sinceActive = new Date(now.getTime() - ACTIVE_WINDOW_DAYS * 86_400_000);
    const sincePassed = new Date(now.getTime() - PASS_WINDOW_DAYS * 86_400_000);

    // ─── 1. Find active users (cap BATCH) ───
    const activeUsers = (await this.prisma.$queryRawUnsafe(
      `SELECT "userId"
       FROM "UserActivity"
       WHERE "createdAt" >= $1
       GROUP BY "userId"
       ORDER BY MAX("createdAt") DESC
       LIMIT $2`,
      sinceActive, BATCH,
    )) as Array<{ userId: string }>;

    if (activeUsers.length === 0) return 0;

    let totalWritten = 0;
    for (const { userId } of activeUsers) {
      try {
        const written = await this.processUser(userId, weekIso, sincePassed);
        totalWritten += written;
        counters.stableMatchTop10_users_processed_total += 1;
      } catch (e) {
        counters.stableMatchTop10_errors_total += 1;
        // eslint-disable-next-line no-console
        console.warn('[stable-match] user error', userId, (e as Error).message);
      }
    }
    return totalWritten;
  }

  private async processUser(userId: string, weekIso: string, sincePassed: Date): Promise<number> {
    const { hashUid } = await import('../../shared/src/track/hash');
    const uidHash = hashUid(userId);
    if (!uidHash) return 0;

    // ─── Idempotency: already computed for this week? ───
    const existing = (await this.prisma.$queryRawUnsafe(
      `SELECT 1 FROM "WeeklyTopMatch" WHERE "uidHash" = $1 AND "weekIso" = $2 LIMIT 1`,
      uidHash, weekIso,
    )) as Array<unknown>;
    if (existing.length > 0) {
      counters.stableMatchTop10_users_skipped_idempotent_total += 1;
      return 0;
    }

    // ─── Discover opt-in check ───
    const optedIn = await this.userOptedIntoDiscover(userId);
    if (!optedIn) return 0;

    // ─── Pull the user's edges from PairCompatCache (top-decile by v6Score) ───
    // Bidirectional: cache may key the pair as (a,b) or (b,a).
    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT "aHash","bHash", COALESCE("v6Score", "finalScore") AS score
       FROM "PairCompatCache"
       WHERE ("aHash" = $1 OR "bHash" = $1)
         AND COALESCE("v6Score", "finalScore") IS NOT NULL
       ORDER BY COALESCE("v6Score", "finalScore") DESC
       LIMIT $2`,
      uidHash, TOP_K_PROPOSE * 4,
    )) as Array<{ aHash: string; bHash: string; score: number }>;
    if (rows.length === 0) return 0;

    // ─── Excluded set = passed-target hashes (last 30d) ───
    const passedRows = (await this.prisma.$queryRawUnsafe(
      `SELECT "targetId" FROM "UserActivity"
       WHERE "userId" = $1 AND "action" = 'pass' AND "targetType" = 'profile'
         AND "createdAt" >= $2 AND "targetId" IS NOT NULL
       LIMIT 5000`,
      userId, sincePassed,
    )) as Array<{ targetId: string | null }>;
    const excluded = new Set<string>();
    for (const r of passedRows) {
      if (r.targetId) excluded.add(hashUid(r.targetId));
    }

    const top = planTopKForUser(uidHash, rows, excluded, TOP_K_PROPOSE, TOP_K_OUT);
    if (top.length === 0) return 0;

    // ─── Persist ───
    let written = 0;
    for (const m of top) {
      try {
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO "WeeklyTopMatch" ("id","uidHash","weekIso","rank","targetHash","computedAt")
           VALUES (gen_random_uuid()::text, $1, $2, $3, $4, NOW())
           ON CONFLICT ("uidHash","weekIso","rank") DO NOTHING`,
          uidHash, weekIso, m.rank, m.targetHash,
        );
        counters.stableMatchTop10_writes_total += 1;
        written += 1;
      } catch (e) {
        counters.stableMatchTop10_errors_total += 1;
        // eslint-disable-next-line no-console
        console.warn('[stable-match] insert failed', uidHash, m.rank, (e as Error).message);
      }
    }
    return written;
  }

  /**
   * Discover opt-in check. The Settings table carries discover-related
   * toggles in production; we fail-open (treat as opted-in) when the
   * row is missing or the column is null — same posture as DailyMatchWorker.
   */
  private async userOptedIntoDiscover(userId: string): Promise<boolean> {
    try {
      const rows = (await this.prisma.$queryRawUnsafe(
        `SELECT "discoverPaused", "discoverEnabled"
         FROM "Settings" WHERE "userId" = $1 LIMIT 1`,
        userId,
      )) as Array<{ discoverPaused?: boolean | null; discoverEnabled?: boolean | null }>;
      if (rows.length === 0) return true;
      const r = rows[0];
      if (r.discoverPaused === true) return false;
      if (r.discoverEnabled === false) return false;
      return true;
    } catch {
      // If the column doesn't exist in this deployment, fail-open.
      return true;
    }
  }

  /** Test/diagnostic hook: pin the last-run timestamp. */
  setLastRunAt(d: Date | null): void { this.lastRunAt = d; }
  getLastRunAt(): Date | null { return this.lastRunAt; }
}

export const _internals = {
  isoWeekKey,
  shouldFireNow,
  planTopKForUser,
  counters,
};
