/**
 * Fairness audit — v3.6.0.
 *
 * Daily 02:00 UTC job. Aggregates `card.impression.50` counts from
 * `EventAggDaily` (trailing 7 days), joins to Profile.gender, computes the
 * gender-conditional Gini per `fairnessRerank.genderConditionalGini`,
 * and writes the result as a single `AuditLog` row with
 * `action='fairness_audit'` and a JSON `details` payload.
 *
 * The alert threshold is `FAIRNESS_AUDIT_GINI_ALERT` (default 0.45). When
 * any gender bucket's Gini exceeds the threshold, the job logs an
 * `FAIRNESS_GINI_ALERT` line at warn level and bumps the alert counter.
 *
 * Default-OFF: set FAIRNESS_AUDIT_ENABLED=1 to start the loop.
 *
 * Spec: DESIGN_SECTION_B_exposure_and_ranking.md §B.8.
 */
import type { PrismaClient } from '@prisma/client';
import { genderConditionalGini, type FairnessCandidate } from '../../shared/src/algo/v8/fairnessRerank';
import { fairnessGiniPerGender } from '../../shared/src/metrics';

const INTERVAL_MS = Number(process.env.FAIRNESS_AUDIT_INTERVAL_MS || 10 * 60 * 1000);
const LOOKBACK_DAYS = Number(process.env.FAIRNESS_AUDIT_LOOKBACK_DAYS || 7);
const ALERT_THRESHOLD = Number(process.env.FAIRNESS_AUDIT_GINI_ALERT || 0.45);
const TARGET_HOUR_UTC = Number(process.env.FAIRNESS_AUDIT_HOUR_UTC || 2);
const IMPRESSION_EVENT = process.env.FAIRNESS_AUDIT_EVENT || 'card.impression.50';
const ENABLED = process.env.FAIRNESS_AUDIT_ENABLED === '1';

/**
 * Decide whether the worker should fire on this tick.
 *
 * Pure. Returns true iff:
 *   - now is within the target UTC hour (default 02:00–02:59), AND
 *   - lastRun is null OR (now - lastRun) >= 23h (so the daily window doesn't
 *     accidentally double-fire on a slow-tick deployment).
 */
export function shouldFireNow(
  now: Date,
  lastRun: Date | null,
  targetHourUtc = TARGET_HOUR_UTC,
  minIntervalMs = 23 * 60 * 60 * 1000,
): boolean {
  if (now.getUTCHours() !== targetHourUtc) return false;
  if (!lastRun) return true;
  return now.getTime() - lastRun.getTime() >= minIntervalMs;
}

/** Per-user impression count (trailing 7d) joined to gender. */
export interface ImpressionAggRow {
  uidHash: string;
  impressions: number;
  gender: 'm' | 'f' | 'o' | null;
}

/**
 * Pure helper: project ImpressionAggRow[] into FairnessCandidate[] for the
 * Gini calculator. Out-of-bucket rows (gender null or unknown) are passed
 * through; the Gini calc ignores them per-bucket.
 */
export function buildFairnessCandidates(
  rows: readonly ImpressionAggRow[],
): FairnessCandidate[] {
  return rows.map((r) => ({
    targetHash: r.uidHash,
    score: 0, // not used for the audit Gini calc
    exposureCountLast7d: Math.max(0, Number(r.impressions || 0)),
    gender: r.gender ?? null,
  }));
}

/**
 * Pure: given a Gini result and an alert threshold, return the buckets
 * that exceed the threshold. Used by `tick()` to gate the warn-level log.
 */
export function bucketsOverThreshold(
  g: { m: number; f: number; o: number },
  threshold: number,
): Array<'m' | 'f' | 'o'> {
  const out: Array<'m' | 'f' | 'o'> = [];
  if (g.m > threshold) out.push('m');
  if (g.f > threshold) out.push('f');
  if (g.o > threshold) out.push('o');
  return out;
}

/**
 * Pure: normalise a Prisma-Profile-style gender string into the closed
 * set {'m','f','o'}. Anything else collapses to null so the per-gender
 * buckets stay clean.
 */
export function normaliseGender(raw: string | null | undefined): 'm' | 'f' | 'o' | null {
  if (!raw) return null;
  const v = String(raw).trim().toLowerCase();
  if (v === 'm' || v === 'male' || v === 'man') return 'm';
  if (v === 'f' || v === 'female' || v === 'woman') return 'f';
  if (v === 'o' || v === 'other' || v === 'nonbinary' || v === 'non-binary') return 'o';
  return null;
}

/** In-process counters surfaced through /v4/status. */
type FACounters = {
  fairnessAudit_runs_total: number;
  fairnessAudit_writes_total: number;
  fairnessAudit_errors_total: number;
  fairnessAudit_alerts_total: number;
  fairnessAudit_users_audited_total: number;
};
const counters: FACounters = {
  fairnessAudit_runs_total: 0,
  fairnessAudit_writes_total: 0,
  fairnessAudit_errors_total: 0,
  fairnessAudit_alerts_total: 0,
  fairnessAudit_users_audited_total: 0,
};
export function getFairnessAuditCounters(): Readonly<FACounters> {
  return { ...counters };
}
export class FairnessAudit {
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastRunAt: Date | null = null;

  constructor(private prisma: PrismaClient) {}

  isEnabled(): boolean { return ENABLED; }

  start(): void {
    if (!ENABLED) return;
    this.timer = setInterval(() => {
      this.tick().catch((e) => {
        counters.fairnessAudit_errors_total += 1;
        // eslint-disable-next-line no-console
        console.warn('[fairness-audit] tick error:', (e as Error).message);
      });
    }, INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async tick(now: Date = new Date()): Promise<number> {
    if (!shouldFireNow(now, this.lastRunAt)) return 0;
    counters.fairnessAudit_runs_total += 1;
    this.lastRunAt = now;

    try {
      const rows = await this.fetchImpressionRows();
      counters.fairnessAudit_users_audited_total += rows.length;
      const candidates = buildFairnessCandidates(rows);
      const gini = genderConditionalGini(candidates);

      // Phase C.3 — publish each gender bucket's Gini as a Prometheus
      // gauge. CloudWatch / Grafana alarms read this metric directly
      // (target: alarm when any bucket > 0.45 sustained for 6h).
      try {
        fairnessGiniPerGender.set({ gender: 'm' }, gini.m);
        fairnessGiniPerGender.set({ gender: 'f' }, gini.f);
        fairnessGiniPerGender.set({ gender: 'o' }, gini.o);
      } catch { /* metrics never block the audit */ }

      const overs = bucketsOverThreshold(gini, ALERT_THRESHOLD);
      if (overs.length > 0) {
        counters.fairnessAudit_alerts_total += 1;
        // eslint-disable-next-line no-console
        console.warn('FAIRNESS_GINI_ALERT', JSON.stringify({
          gini, threshold: ALERT_THRESHOLD, overBuckets: overs, ts: now.toISOString(),
        }));
      }

      const wrote = await this.writeAuditRow({
        gini,
        threshold: ALERT_THRESHOLD,
        overBuckets: overs,
        usersAudited: rows.length,
        lookbackDays: LOOKBACK_DAYS,
        computedAt: now.toISOString(),
      });
      if (wrote) counters.fairnessAudit_writes_total += 1;
      return wrote ? 1 : 0;
    } catch (e) {
      counters.fairnessAudit_errors_total += 1;
      // eslint-disable-next-line no-console
      console.warn('[fairness-audit] failure:', (e as Error).message);
      return 0;
    }
  }

  /**
   * Pull trailing-7d impressions from `EventAggDaily` for the configured
   * impression event, joined to `Profile.gender` (via the User table since
   * Profile is keyed by userId, not uidHash). We hash userId on the fly so
   * the join executes in the worker (the schema mirrors don't share a
   * hashed-uid column across both tables).
   */
  private async fetchImpressionRows(): Promise<ImpressionAggRow[]> {
    const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000);

    const aggRows = (await this.prisma.$queryRawUnsafe(
      `SELECT "uidHash", SUM("count")::bigint AS "impressions"
       FROM "EventAggDaily"
       WHERE "evt" = $1 AND "day" >= $2
       GROUP BY "uidHash"`,
      IMPRESSION_EVENT, since,
    )) as Array<{ uidHash: string; impressions: bigint | number }>;

    if (aggRows.length === 0) return [];

    // Cross-walk uidHash → Profile.gender. Profile is keyed by userId, so
    // we must hash all candidate userIds and build an in-memory lookup.
    const profileRows = (await this.prisma.$queryRawUnsafe(
      `SELECT p."userId", p."gender"
       FROM "Profile" p`,
    )) as Array<{ userId: string; gender: string | null }>;

    const { hashUid } = await import('../../shared/src/track/hash');
    const genderByHash = new Map<string, 'm' | 'f' | 'o' | null>();
    for (const p of profileRows) {
      const h = hashUid(p.userId);
      if (h) genderByHash.set(h, normaliseGender(p.gender));
    }

    return aggRows.map((r) => ({
      uidHash: r.uidHash,
      impressions: typeof r.impressions === 'bigint' ? Number(r.impressions) : Number(r.impressions || 0),
      gender: genderByHash.get(r.uidHash) ?? null,
    }));
  }

  /**
   * Persist a single audit row. Because AuditLog requires a real userId
   * FK (cascade-on-delete), we either:
   *   a. Use a configured system user id (FAIRNESS_AUDIT_SYSTEM_USER_ID), or
   *   b. Fall back to *any* existing user (first one by createdAt).
   * If neither resolves to an existing user, we skip the DB write and
   * the audit lives only in the structured log line + counters.
   */
  private async writeAuditRow(details: Record<string, unknown>): Promise<boolean> {
    const systemUserId = process.env.FAIRNESS_AUDIT_SYSTEM_USER_ID
      || (await this.findFallbackUserId());
    if (!systemUserId) {
      // eslint-disable-next-line no-console
      console.warn('[fairness-audit] no system userId — skipping DB row', JSON.stringify(details));
      return false;
    }
    try {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "AuditLog" ("id","userId","action","details","createdAt")
         VALUES (gen_random_uuid()::text, $1, $2, $3, NOW())`,
        systemUserId, 'fairness_audit', JSON.stringify(details),
      );
      return true;
    } catch (e) {
      counters.fairnessAudit_errors_total += 1;
      // eslint-disable-next-line no-console
      console.warn('[fairness-audit] insert failed:', (e as Error).message);
      return false;
    }
  }

  private async findFallbackUserId(): Promise<string | null> {
    try {
      const rows = (await this.prisma.$queryRawUnsafe(
        `SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1`,
      )) as Array<{ id: string }>;
      return rows[0]?.id ?? null;
    } catch {
      return null;
    }
  }

  /** Test/diagnostic hook. */
  setLastRunAt(d: Date | null): void { this.lastRunAt = d; }
  getLastRunAt(): Date | null { return this.lastRunAt; }
}

export const _internals = {
  shouldFireNow,
  buildFairnessCandidates,
  bucketsOverThreshold,
  normaliseGender,
  counters,
};
