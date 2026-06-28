/**
 * Right-to-erasure helper.
 *
 * Takes a userId, computes its hash under the current secret, and deletes
 * matching rows from all tracking tables. Called by:
 *   - the standalone CLI: `npm run -w services/tracking-worker forget -- <uid>`
 *   - the ingest /v1/track/forget endpoint (via a job queue in Phase 2+)
 *
 * Rotating TRACKING_HASH_SECRET breaks future joins from new aggregates,
 * but historical rows must be deleted explicitly — that's what this does.
 */
import { createHmac } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';

const SECRET = process.env.TRACKING_HASH_SECRET || 'dev-only-tracking-hash-secret-change-me';

export function hashUid(id: string): string {
  if (!id) return '';
  return createHmac('sha256', SECRET).update(id).digest('base64url').slice(0, 22);
}

export type ForgetResult = {
  uidHash: string;
  hourly: number;
  daily: number;
  snapshot: number;
  compatA: number;
  compatB: number;
  consent: number;
};

export async function forgetUser(prisma: PrismaClient, userId: string): Promise<ForgetResult> {
  const uidHash = hashUid(userId);
  if (!uidHash) {
    return { uidHash: '', hourly: 0, daily: 0, snapshot: 0, compatA: 0, compatB: 0, consent: 0 };
  }
  const hourly = await prisma.$executeRawUnsafe(
    `DELETE FROM "EventAggHourly" WHERE "uidHash" = $1`, uidHash,
  );
  const daily = await prisma.$executeRawUnsafe(
    `DELETE FROM "EventAggDaily" WHERE "uidHash" = $1`, uidHash,
  );
  const snapshot = await prisma.$executeRawUnsafe(
    `DELETE FROM "FeatureSnapshot" WHERE "uidHash" = $1`, uidHash,
  );
  const compatA = await prisma.$executeRawUnsafe(
    `DELETE FROM "PairCompatCache" WHERE "aHash" = $1`, uidHash,
  );
  const compatB = await prisma.$executeRawUnsafe(
    `DELETE FROM "PairCompatCache" WHERE "bHash" = $1`, uidHash,
  );
  // ConsentEvent keys on userId, not uidHash — we keep this row by design as
  // audit evidence, but redact the userId.
  const consent = await prisma.$executeRawUnsafe(
    `UPDATE "ConsentEvent" SET "userId" = NULL WHERE "userId" = $1`, userId,
  );
  return { uidHash, hourly: Number(hourly), daily: Number(daily), snapshot: Number(snapshot), compatA: Number(compatA), compatB: Number(compatB), consent: Number(consent) };
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
