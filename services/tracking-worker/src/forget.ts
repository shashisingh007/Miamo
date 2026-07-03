/**
 * Right-to-erasure helper.
 *
 * Takes a userId, computes its hash under the current secret, and deletes
 * matching rows from EVERY uidHash-keyed table in the tracking pipeline.
 *
 * bug-hunt part2 fix #10 (docs/architecture/bug-hunt-2026-07-part2.md #14
 * + #16, P0/P1) — the previous implementation only deleted from 4 tables
 * (EventAggHourly, EventAggDaily, FeatureSnapshot, PairCompatCache),
 * leaving 9 uidHash-keyed tables untouched (SessionSummary,
 * FocusAffinityHourly, UserWeightProfile, UserMoveProfile, SafetyAgg,
 * FirstMoveOutcome, ExposureLedger, ExposureCredit, WeeklyTopMatch).
 * Under DPDP §11 those rows are personal data still linked (pseudonymously)
 * to the ex-user's behaviour. Fix: expand the table list AND wrap the full
 * fan-out in a `$transaction([...])` so a mid-sequence DB failure rolls
 * back rather than leaving the user half-forgotten.
 *
 * bug-hunt part2 fix #3 also lands here — the SECRET is now resolved
 * per-call so late-hydrated env values (via `secrets.ts`) are picked up.
 *
 * Called by:
 *   - the standalone CLI: `npm run -w services/tracking-worker forget -- <uid>`
 *   - the ingest /v1/track/forget endpoint (via a job queue in Phase 2+)
 */
import { createHmac } from 'node:crypto';
import type { PrismaClient, Prisma } from '@prisma/client';

let _cachedSecret: string | null = null;
function resolveTrackingSecret(): string {
  const cur = process.env.TRACKING_HASH_SECRET || 'dev-only-tracking-hash-secret-change-me';
  if (cur !== _cachedSecret) _cachedSecret = cur;
  return cur;
}

export function hashUid(id: string): string {
  if (!id) return '';
  return createHmac('sha256', resolveTrackingSecret()).update(id).digest('base64url').slice(0, 22);
}

/** Test-only: force a re-read of the secret on the next call. */
export function _resetHashSecretCache(): void { _cachedSecret = null; }

export type ForgetResult = {
  uidHash: string;
  hourly: number;
  daily: number;
  snapshot: number;
  compatA: number;
  compatB: number;
  sessionSummary: number;
  focusAffinity: number;
  userWeightProfile: number;
  userMoveProfile: number;
  safetyAgg: number;
  firstMoveOutcomeA: number;
  firstMoveOutcomeB: number;
  deferredItem: number;
  exposureLedger: number;
  exposureCredit: number;
  weeklyTopMatch: number;
  weeklyTopMatchTarget: number;
  consent: number;
};

/**
 * Delete every uidHash-keyed row for a user AND redact the userId column on
 * ConsentEvent (kept for audit evidence per DPDP art. 8, but PII stripped).
 *
 * Every write happens inside a single `$transaction([...])`. If any write
 * fails, none commit — the user is left in a consistent "not forgotten"
 * state that the caller can retry safely.
 */
export async function forgetUser(prisma: PrismaClient, userId: string): Promise<ForgetResult> {
  const uidHash = hashUid(userId);
  if (!uidHash) {
    return {
      uidHash: '',
      hourly: 0, daily: 0, snapshot: 0, compatA: 0, compatB: 0,
      sessionSummary: 0, focusAffinity: 0, userWeightProfile: 0,
      userMoveProfile: 0, safetyAgg: 0, firstMoveOutcomeA: 0,
      firstMoveOutcomeB: 0, deferredItem: 0, exposureLedger: 0,
      exposureCredit: 0, weeklyTopMatch: 0, weeklyTopMatchTarget: 0,
      consent: 0,
    };
  }
  // Each $executeRawUnsafe returns a Number of affected rows. We batch every
  // delete inside a single interactive $transaction so a mid-sequence
  // failure rolls back — the caller can retry safely instead of retrying a
  // partial state.
  const results = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const hourly = await tx.$executeRawUnsafe(
      `DELETE FROM "EventAggHourly" WHERE "uidHash" = $1`, uidHash,
    );
    const daily = await tx.$executeRawUnsafe(
      `DELETE FROM "EventAggDaily" WHERE "uidHash" = $1`, uidHash,
    );
    const snapshot = await tx.$executeRawUnsafe(
      `DELETE FROM "FeatureSnapshot" WHERE "uidHash" = $1`, uidHash,
    );
    const compatA = await tx.$executeRawUnsafe(
      `DELETE FROM "PairCompatCache" WHERE "aHash" = $1`, uidHash,
    );
    const compatB = await tx.$executeRawUnsafe(
      `DELETE FROM "PairCompatCache" WHERE "bHash" = $1`, uidHash,
    );
    const sessionSummary = await tx.$executeRawUnsafe(
      `DELETE FROM "SessionSummary" WHERE "uidHash" = $1`, uidHash,
    );
    const focusAffinity = await tx.$executeRawUnsafe(
      `DELETE FROM "FocusAffinityHourly" WHERE "uidHash" = $1`, uidHash,
    );
    const userWeightProfile = await tx.$executeRawUnsafe(
      `DELETE FROM "UserWeightProfile" WHERE "uidHash" = $1`, uidHash,
    );
    const userMoveProfile = await tx.$executeRawUnsafe(
      `DELETE FROM "UserMoveProfile" WHERE "uidHash" = $1`, uidHash,
    );
    const safetyAgg = await tx.$executeRawUnsafe(
      `DELETE FROM "SafetyAgg" WHERE "uidHash" = $1`, uidHash,
    );
    const firstMoveOutcomeA = await tx.$executeRawUnsafe(
      `DELETE FROM "FirstMoveOutcome" WHERE "aHash" = $1`, uidHash,
    );
    const firstMoveOutcomeB = await tx.$executeRawUnsafe(
      `DELETE FROM "FirstMoveOutcome" WHERE "bHash" = $1`, uidHash,
    );
    const deferredItem = await tx.$executeRawUnsafe(
      `DELETE FROM "DeferredItem" WHERE "uidHash" = $1`, uidHash,
    );
    const exposureLedger = await tx.$executeRawUnsafe(
      `DELETE FROM "ExposureLedger" WHERE "uidHash" = $1`, uidHash,
    );
    const exposureCredit = await tx.$executeRawUnsafe(
      `DELETE FROM "ExposureCredit" WHERE "uidHash" = $1`, uidHash,
    );
    const weeklyTopMatch = await tx.$executeRawUnsafe(
      `DELETE FROM "WeeklyTopMatch" WHERE "uidHash" = $1`, uidHash,
    );
    // Also remove rows where this user is the *target* of another user's top-10.
    const weeklyTopMatchTarget = await tx.$executeRawUnsafe(
      `DELETE FROM "WeeklyTopMatch" WHERE "targetHash" = $1`, uidHash,
    );
    // ConsentEvent keys on userId (not uidHash) — we keep the row as audit
    // evidence per DPDP art. 8 but redact the userId column.
    const consent = await tx.$executeRawUnsafe(
      `UPDATE "ConsentEvent" SET "userId" = NULL WHERE "userId" = $1`, userId,
    );
    return {
      hourly, daily, snapshot, compatA, compatB,
      sessionSummary, focusAffinity, userWeightProfile, userMoveProfile,
      safetyAgg, firstMoveOutcomeA, firstMoveOutcomeB, deferredItem,
      exposureLedger, exposureCredit, weeklyTopMatch, weeklyTopMatchTarget,
      consent,
    };
  });
  return {
    uidHash,
    hourly: Number(results.hourly),
    daily: Number(results.daily),
    snapshot: Number(results.snapshot),
    compatA: Number(results.compatA),
    compatB: Number(results.compatB),
    sessionSummary: Number(results.sessionSummary),
    focusAffinity: Number(results.focusAffinity),
    userWeightProfile: Number(results.userWeightProfile),
    userMoveProfile: Number(results.userMoveProfile),
    safetyAgg: Number(results.safetyAgg),
    firstMoveOutcomeA: Number(results.firstMoveOutcomeA),
    firstMoveOutcomeB: Number(results.firstMoveOutcomeB),
    deferredItem: Number(results.deferredItem),
    exposureLedger: Number(results.exposureLedger),
    exposureCredit: Number(results.exposureCredit),
    weeklyTopMatch: Number(results.weeklyTopMatch),
    weeklyTopMatchTarget: Number(results.weeklyTopMatchTarget),
    consent: Number(results.consent),
  };
}

// CLI entry: `tsx src/forget.ts <userId>`
if (require.main === module) {
  const uid = process.argv[2];
  if (!uid) {
    // eslint-disable-next-line no-console
    console.error('usage: forget <userId>');
    process.exit(2);
  }
  // Lazy import to keep cold-start fast for the CLI path.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  forgetUser(prisma, uid)
    .then((r) => {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(r, null, 2));
      return prisma.$disconnect();
    })
    .then(() => process.exit(0))
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.error('[forget] failed:', e);
      process.exit(1);
    });
}
