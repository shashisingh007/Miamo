/**
 * Exposure-credit scheduler — v3.6.0.
 *
 * Drives the v8 earned-visibility ledger end-to-end:
 *   1. Pull UserActivity rows for the last 24h (active users only).
 *   2. Classify each row into one of the six quality actions:
 *        sticky_like, message_reply, dtm_completed, bio_expand_long,
 *        view_long, move_accepted
 *   3. Call `creditForAction(action, isPremium)` for each, append an
 *      `ExposureLedger` row, upsert into `ExposureCredit`.
 *   4. Detect rage-like patterns via `isRageLike(...)`. On detect, append
 *      a zero-slot `rage_like_zero` audit row and bump a counter.
 *   5. Idempotency: every UserActivity row gets at most one ledger entry
 *      keyed by `refId = "ua:<userActivity.id>"`. We check ExposureLedger.refId
 *      before writing.
 *
 * Pure helpers live below the class and are re-exported through `_internals`
 * for unit tests. The class is a thin I/O shell that follows the
 * `LearnerLoop` / `SafetyRollup` patterns in this directory.
 *
 * Default-OFF: set EXPOSURE_SCHEDULER_ENABLED=1 to start the loop.
 *
 * Spec: DESIGN_SECTION_B_exposure_and_ranking.md §B.4 + §B.5.6.
 */
import type { PrismaClient } from '@prisma/client';
import {
  creditForAction,
  isRageLike,
  rageLikeAudit,
} from '../../shared/src/algo/v8/exposureCredits';
import { isUserPremiumBulk } from '../../shared/src/premium';
import { emitServerEvent } from '../../shared/src/track/serverEmit';
import { exposureCreditWrites } from '../../shared/src/metrics';

const INTERVAL_MS = Number(process.env.EXPOSURE_SCHEDULER_INTERVAL_MS || 5 * 60 * 1000);
const BATCH = Number(process.env.EXPOSURE_SCHEDULER_BATCH || 200);
const LOOKBACK_HOURS = Number(process.env.EXPOSURE_SCHEDULER_LOOKBACK_HOURS || 24);
const SURFACE = process.env.EXPOSURE_SCHEDULER_SURFACE || 'discover';
const ENABLED = process.env.EXPOSURE_SCHEDULER_ENABLED === '1';

/** Quality actions that earn exposure credits per §B.4. */
export type QualityAction =
  | 'sticky_like'
  | 'message_reply'
  | 'dtm_completed'
  | 'bio_expand_long'
  | 'view_long'
  | 'move_accepted';

export interface ActivityRow {
  id: string;
  userId: string;
  action: string;        // 'like' | 'pass' | 'view' | 'message' | 'dtm' | 'move' | ...
  targetType: string;    // 'profile' | 'message' | 'dtm' | ...
  targetId: string | null;
  metadata: string | null;
  durationMs: number | null;
  createdAt: Date;
}

/**
 * Pure classifier. Returns the quality-action key for an UserActivity row,
 * or null if the row does not qualify. The mapping mirrors §B.4 + the v8
 * credit table; metadata is read as JSON for the duration/dwell hints.
 *
 * Rules:
 *   - `like`               → sticky_like  (the scheduler runs ≥60s after the
 *                            event, so by the time we see the row in the
 *                            lookback window any same-target 'pass' undo
 *                            would already be visible to the dedupe pass).
 *   - `message`            → message_reply  (Section B reuses the existing
 *                            FirstMoveOutcome reconciler — when metadata
 *                            carries `firstMove:true` and `replied:true`,
 *                            we credit the sender).
 *   - `dtm`/'dtm_completed' → dtm_completed (when metadata.complete === true).
 *   - `view` w/ durationMs ≥ 7000  → view_long.
 *   - `view` w/ metadata.bioExpandedMs ≥ 3000 → bio_expand_long.
 *   - `move` w/ metadata.accepted === true and reply landed → move_accepted.
 *
 * The classifier is deliberately conservative — the boundary conditions
 * (60s sticky window, 7d reply window) live in the writer worker that
 * decorates UserActivity rows; this function trusts the metadata it sees.
 */
export function classifyActivity(row: ActivityRow): QualityAction | null {
  const meta = parseMetaSafe(row.metadata);
  const action = String(row.action || '').toLowerCase();
  const targetType = String(row.targetType || '').toLowerCase();
  // sticky_like — like rows that survived the buyer's-remorse window.
  // The presence of an explicit `sticky:true` overrides; otherwise the
  // scheduler's lookback (≥60s after createdAt) plus the absence of a
  // same-target pass-undo means we treat the row as sticky.
  if (action === 'like' && targetType === 'profile') {
    if (meta.sticky === false) return null;
    if (meta.undone === true) return null;
    return 'sticky_like';
  }
  // message_reply — the existing FirstMoveOutcome writer marks
  // `firstMove:true` on sender rows; the consumer flips `replied:true`
  // once a reply lands within the 7d window.
  if (action === 'message' && meta.firstMove === true && meta.replied === true) {
    return 'message_reply';
  }
  // dtm_completed — DTM session row with completion flag.
  if ((action === 'dtm_completed' || action === 'dtm') && meta.complete === true) {
    return 'dtm_completed';
  }
  // view_long — profile view ≥7s with deep scroll.
  if (action === 'view' && targetType === 'profile') {
    const dwell = Number(row.durationMs || meta.dwellMs || 0);
    const bioExpanded = Number(meta.bioExpandedMs || 0);
    const deepScroll = meta.deepScroll === true || (Number(meta.scrollDepth) || 0) >= 0.6;
    if (bioExpanded >= 3000) return 'bio_expand_long';
    if (dwell >= 7000 && deepScroll) return 'view_long';
    return null;
  }
  // move_accepted — Move v2 suggestion accepted *and* reply received.
  if (action === 'move' && meta.accepted === true && meta.replied === true) {
    return 'move_accepted';
  }
  return null;
}

/** Tiny safe JSON parser — UserActivity.metadata is a TEXT column. */
function parseMetaSafe(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/**
 * Pure helper: given a user's recent like timestamps, decide whether to
 * write a `rage_like_zero` audit row. Delegates the threshold logic to
 * the v8 module so the tests can pin the boundaries in one place.
 */
export function shouldEmitRageLikeAudit(
  likeTimestampsMs: readonly number[],
  nowMs: number,
): boolean {
  return isRageLike(likeTimestampsMs, nowMs);
}

/**
 * Pure helper: fold a per-user list of classified rows into the credit
 * deltas that must be appended. Returns one entry per row that should
 * produce a ledger write; refIds are already populated.
 *
 * `isPremium` flows into `creditForAction` per §B.5.5 — premium is a
 * 1.5× earn multiplier capped at 2× by the v8 module.
 */
export function planLedgerWrites(
  rows: ReadonlyArray<{ row: ActivityRow; action: QualityAction }>,
  isPremium: boolean,
): Array<{
  refId: string;
  reason: string;
  slotsFloat: number;
  slotsInt: number;
  meta: { activityId: string; action: QualityAction; isPremium: boolean };
}> {
  const out: Array<{
    refId: string;
    reason: string;
    slotsFloat: number;
    slotsInt: number;
    meta: { activityId: string; action: QualityAction; isPremium: boolean };
  }> = [];
  for (const { row, action } of rows) {
    const refId = `ua:${row.id}`;
    const ev = creditForAction(action, isPremium, refId);
    out.push({
      refId,
      reason: ev.reason,
      slotsFloat: ev.slots,
      // Schema stores slots as Int — round to nearest whole slot. The 0.5
      // bases (bio_expand_long, view_long) combined w/ premium 1.5× round
      // to 1 either way, which is intentional: we don't want fractional
      // ledger rows in the audit trail.
      slotsInt: Math.round(ev.slots),
      meta: { activityId: row.id, action, isPremium },
    });
  }
  return out;
}

/** In-process counters surfaced through /v4/status. */
type SchedulerCounters = {
  exposureScheduler_runs_total: number;
  exposureScheduler_writes_total: number;
  exposureScheduler_errors_total: number;
  exposureScheduler_rage_like_audits_total: number;
  exposureScheduler_idempotent_skips_total: number;
};
const counters: SchedulerCounters = {
  exposureScheduler_runs_total: 0,
  exposureScheduler_writes_total: 0,
  exposureScheduler_errors_total: 0,
  exposureScheduler_rage_like_audits_total: 0,
  exposureScheduler_idempotent_skips_total: 0,
};
export function getExposureSchedulerCounters(): Readonly<SchedulerCounters> {
  return { ...counters };
}
export class ExposureScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private prisma: PrismaClient) {}

  isEnabled(): boolean { return ENABLED; }

  start(): void {
    if (!ENABLED) return;
    this.timer = setInterval(() => {
      this.tick().catch((e) => {
        counters.exposureScheduler_errors_total += 1;
        // eslint-disable-next-line no-console
        console.warn('[exposure-scheduler] tick error:', (e as Error).message);
      });
    }, INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /**
   * One run of the scheduler. Returns the number of ledger rows written.
   * Always best-effort: a per-user error counts + continues; never throws.
   */
  async tick(): Promise<number> {
    counters.exposureScheduler_runs_total += 1;
    let written = 0;

    // ─────── 1. Find active users in the lookback window ───────
    // We page through `UserActivity` keyed by user, capped at BATCH users.
    // The aggregation here is intentionally userId-based because uidHash
    // is computed downstream from the userId; UserActivity itself is
    // keyed on the real userId.
    const sinceIso = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000);
    const activeUsers = (await this.prisma.$queryRawUnsafe(
      `SELECT "userId"
       FROM "UserActivity"
       WHERE "createdAt" >= $1
       GROUP BY "userId"
       ORDER BY MAX("createdAt") DESC
       LIMIT $2`,
      sinceIso, BATCH,
    )) as Array<{ userId: string }>;

    if (activeUsers.length === 0) return 0;

    // Bulk-resolve premium status for the whole batch once per tick. Avoids
    // an N+1 lookup inside processUser. Map keyed by userId; missing → false.
    const premiumByUserId = await isUserPremiumBulk(
      this.prisma,
      activeUsers.map((u) => u.userId),
    );

    // ─────── 2. For each user: classify, dedupe, write ───────
    for (const { userId } of activeUsers) {
      try {
        const isPremium = premiumByUserId.get(userId) === true;
        const userWrites = await this.processUser(userId, sinceIso, isPremium);
        written += userWrites;
      } catch (e) {
        counters.exposureScheduler_errors_total += 1;
        // eslint-disable-next-line no-console
        console.warn('[exposure-scheduler] user error', userId, (e as Error).message);
      }
    }
    return written;
  }

  /**
   * Process a single user's lookback window. Best-effort; logs + counts
   * any per-row failure and continues.
   *
   * Steps for each user:
   *   - Read UserActivity rows from sinceIso.
   *   - Classify into quality actions.
   *   - Detect rage-like across the 'like' subset → audit row if triggered.
   *   - For each classified row, skip when ExposureLedger already has a
   *     row with the same refId (idempotency). Otherwise append + upsert.
   */
  private async processUser(userId: string, sinceIso: Date, isPremium: boolean): Promise<number> {
    const uidHash = await this.hashFor(userId);
    if (!uidHash) return 0;

    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT "id","userId","action","targetType","targetId","metadata","durationMs","createdAt"
       FROM "UserActivity"
       WHERE "userId" = $1 AND "createdAt" >= $2
       ORDER BY "createdAt" ASC
       LIMIT 1000`,
      userId, sinceIso,
    )) as ActivityRow[];

    if (rows.length === 0) return 0;

    // ─── rage-like audit (single row per tick if triggered) ───
    const likeTs = rows
      .filter((r) => String(r.action || '').toLowerCase() === 'like')
      .map((r) => r.createdAt.getTime());
    if (likeTs.length > 0 && isRageLike(likeTs, Date.now())) {
      const refId = `rage:${uidHash}:${Math.floor(Date.now() / 60_000)}`;
      const already = await this.refIdExists(uidHash, 'rage_like_zero', refId);
      if (!already) {
        const audit = rageLikeAudit(refId);
        await this.appendLedger(uidHash, 'rage_like_zero', 0, refId, {
          reason: audit.reason, likesInWindow: likeTs.length,
        });
        counters.exposureScheduler_rage_like_audits_total += 1;
      }
    }

    // ─── classify + plan + dedupe + write ───
    const classified: Array<{ row: ActivityRow; action: QualityAction }> = [];
    for (const row of rows) {
      const action = classifyActivity(row);
      if (action) classified.push({ row, action });
    }
    if (classified.length === 0) return 0;

    // v3.6.0 — premium flag resolved per-tick by tick() via isUserPremiumBulk,
    // passed in so processUser stays I/O-bounded to the user's own rows.
    const plans = planLedgerWrites(classified, isPremium);
    let written = 0;
    for (const p of plans) {
      try {
        const exists = await this.refIdExists(uidHash, p.reason, p.refId);
        if (exists) {
          counters.exposureScheduler_idempotent_skips_total += 1;
          continue;
        }
        await this.appendLedger(uidHash, p.reason, p.slotsInt, p.refId, p.meta);
        await this.upsertCredit(uidHash, SURFACE, p.slotsInt);
        counters.exposureScheduler_writes_total += 1;
        // Phase C.3 — Prometheus counter labelled by reason. Cardinality
        // is bounded by the QualityAction enum (≤7 values).
        try { exposureCreditWrites.inc({ reason: String(p.reason).slice(0, 64) }); } catch { /* metrics never block */ }
        written += 1;
        // v3.6.0 — emit `exposure.credit_earned` so the v8 algos see the
        // ledger top-up in real time (not just via aggregate reads). Zero-
        // slot audit rows (rage_like_zero) are not credits and are skipped
        // because the schema requires slots ≥ 1.
        if (p.slotsInt >= 1 && p.slotsInt <= 50 && SURFACE === 'discover') {
          emitServerEvent(this.prisma, userId, 'exposure.credit_earned', {
            surface: SURFACE,
            reason: String(p.reason).slice(0, 64),
            slots: p.slotsInt,
          }, p.refId);
        }
      } catch (e) {
        counters.exposureScheduler_errors_total += 1;
        // eslint-disable-next-line no-console
        console.warn('[exposure-scheduler] write failed', p.refId, (e as Error).message);
      }
    }
    return written;
  }

  /** Compute the uidHash for a userId using the shared hash module. */
  private async hashFor(userId: string): Promise<string> {
    // Lazy import to keep the module pure for unit-test reach; node:crypto
    // is loaded once on first call.
    const { hashUid } = await import('../../shared/src/track/hash');
    return hashUid(userId);
  }

  private async refIdExists(uidHash: string, reason: string, refId: string): Promise<boolean> {
    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT 1 FROM "ExposureLedger"
       WHERE "uidHash" = $1 AND "reason" = $2 AND "refId" = $3
       LIMIT 1`,
      uidHash, reason, refId,
    )) as Array<unknown>;
    return rows.length > 0;
  }

  private async appendLedger(
    uidHash: string,
    reason: string,
    deltaSlots: number,
    refId: string,
    meta: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "ExposureLedger"
         ("id","uidHash","surface","deltaSlots","reason","refId","meta","createdAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6::jsonb, NOW())`,
      uidHash, SURFACE, deltaSlots, reason, refId, JSON.stringify(meta),
    );
  }

  private async upsertCredit(uidHash: string, surface: string, deltaSlots: number): Promise<void> {
    if (deltaSlots === 0) return; // audit-only rows do not touch the cache.
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "ExposureCredit" ("uidHash","surface","slotsEarned","slotsSpent","lastTopUp","updatedAt")
       VALUES ($1, $2, $3, 0, NOW(), NOW())
       ON CONFLICT ("uidHash","surface") DO UPDATE SET
         "slotsEarned" = "ExposureCredit"."slotsEarned" + EXCLUDED."slotsEarned",
         "lastTopUp"   = NOW(),
         "updatedAt"   = NOW()`,
      uidHash, surface, deltaSlots,
    );
  }
}

export const _internals = {
  classifyActivity,
  planLedgerWrites,
  shouldEmitRageLikeAudit,
  parseMetaSafe,
  counters,
};
