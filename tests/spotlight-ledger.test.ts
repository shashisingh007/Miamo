// Spotlight ledger arithmetic & idempotency tests.
// Uses an in-memory PrismaClient mock to validate logic without DB roundtrips.

import { describe, it, expect, beforeEach } from 'vitest';
import {
  isValidPostMinutes, MIN_MINUTES, MAX_MINUTES_PER_POST, MINUTES_STEP,
  appendLedger, getBalance, awardOnce, awardMatchMilestones, awardProfileComplete,
  awardFirstPostInCategory,
  spend, refund,
} from '../services/shared/src/spotlight-ledger';

// ─── Minimal in-memory Prisma stub ───────────────────
function buildMockPrisma() {
  let nextId = 1;
  const ledger: any[] = [];
  const awards: any[] = [];
  const counts: { sumByUser: Map<string, number> } = { sumByUser: new Map() };

  const prisma: any = {
    spotlightLedger: {
      aggregate: async (args: any) => {
        const userId = args.where?.userId;
        const sum = ledger.filter((r) => r.userId === userId).reduce((s, r) => s + r.delta, 0);
        return { _sum: { delta: sum } };
      },
      findMany: async (args: any) => {
        const userId = args.where?.userId;
        const take = args.take ?? 50;
        return ledger.filter((r) => r.userId === userId).slice(-take).reverse();
      },
      create: async ({ data }: any) => {
        const row = { id: `l${nextId++}`, createdAt: new Date(), ...data };
        ledger.push(row);
        return row;
      },
      count: async (args: any) => {
        const userId = args.where?.userId;
        const reason = args.where?.reason;
        return ledger.filter((r) => r.userId === userId && (!reason || r.reason === reason)).length;
      },
    },
    spotlightAward: {
      create: async ({ data }: any) => {
        const dup = awards.find((a) => a.userId === data.userId && a.kind === data.kind);
        if (dup) {
          const err: any = new Error('Unique constraint failed');
          err.code = 'P2002';
          throw err;
        }
        const row = { id: `a${nextId++}`, createdAt: new Date(), ...data };
        awards.push(row);
        return row;
      },
    },
    $transaction: async (fnOrOps: any, _opts?: any) => {
      if (typeof fnOrOps === 'function') return fnOrOps(prisma);
      return Promise.all(fnOrOps);
    },
  };

  return { prisma, ledger, awards };
}

describe('spotlight-ledger: validation', () => {
  it('isValidPostMinutes accepts only multiples of step inside [MIN, MAX]', () => {
    for (let n = MIN_MINUTES; n <= MAX_MINUTES_PER_POST; n += MINUTES_STEP) {
      expect(isValidPostMinutes(n)).toBe(true);
    }
    expect(isValidPostMinutes(MIN_MINUTES - 1)).toBe(false);
    expect(isValidPostMinutes(MAX_MINUTES_PER_POST + MINUTES_STEP)).toBe(false);
    expect(isValidPostMinutes(7)).toBe(false); // not a multiple of 5
    expect(isValidPostMinutes(0)).toBe(false);
    expect(isValidPostMinutes(-5)).toBe(false);
    expect(isValidPostMinutes(NaN)).toBe(false);
  });
});

describe('spotlight-ledger: balance arithmetic', () => {
  it('reflects credits and debits as a running sum', async () => {
    const { prisma } = buildMockPrisma();
    expect(await getBalance(prisma, 'u1')).toBe(0);
    await appendLedger(prisma, 'u1', 10, 'purchase_10min');
    expect(await getBalance(prisma, 'u1')).toBe(10);
    await appendLedger(prisma, 'u1', -5, 'post_spend');
    expect(await getBalance(prisma, 'u1')).toBe(5);
    await appendLedger(prisma, 'u1', 5, 'refund_oops');
    expect(await getBalance(prisma, 'u1')).toBe(10);
  });

  it('spend rejects when balance is insufficient', async () => {
    const { prisma } = buildMockPrisma();
    await appendLedger(prisma, 'u1', 5, 'purchase');
    await expect(spend(prisma, 'u1', 10, 'post_spend')).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE' });
    expect(await getBalance(prisma, 'u1')).toBe(5);
  });

  it('refund credits the requested amount', async () => {
    const { prisma } = buildMockPrisma();
    await appendLedger(prisma, 'u1', 10, 'purchase');
    await spend(prisma, 'u1', 5, 'post_spend', 'p1');
    expect(await getBalance(prisma, 'u1')).toBe(5);
    await refund(prisma, 'u1', 5, 'refund_oops', 'p1');
    expect(await getBalance(prisma, 'u1')).toBe(10);
  });
});

describe('spotlight-ledger: idempotent awards', () => {
  it('awardOnce credits exactly once per (userId, kind)', async () => {
    const { prisma } = buildMockPrisma();
    const a = await awardOnce(prisma, 'u1', 'profile_100', 10);
    expect(a.granted).toBe(true);
    expect(await getBalance(prisma, 'u1')).toBe(10);
    const b = await awardOnce(prisma, 'u1', 'profile_100', 10);
    expect(b.granted).toBe(false);
    expect(await getBalance(prisma, 'u1')).toBe(10);
  });

  it('awardProfileComplete delivers +10 once', async () => {
    const { prisma } = buildMockPrisma();
    await awardProfileComplete(prisma, 'u1');
    await awardProfileComplete(prisma, 'u1');
    expect(await getBalance(prisma, 'u1')).toBe(10);
  });

  it('awardFirstPostInCategory keys by lowercase category name', async () => {
    const { prisma } = buildMockPrisma();
    await awardFirstPostInCategory(prisma, 'u1', 'Music');
    await awardFirstPostInCategory(prisma, 'u1', 'music'); // same kind
    expect(await getBalance(prisma, 'u1')).toBe(5);
    await awardFirstPostInCategory(prisma, 'u1', 'Art'); // different kind
    expect(await getBalance(prisma, 'u1')).toBe(10);
  });

  it('awardMatchMilestones tiers up cumulatively and ignores re-runs', async () => {
    const { prisma } = buildMockPrisma();
    await awardMatchMilestones(prisma, 'u1', 9); // below all thresholds
    expect(await getBalance(prisma, 'u1')).toBe(0);
    await awardMatchMilestones(prisma, 'u1', 10);
    expect(await getBalance(prisma, 'u1')).toBe(10);
    // re-run with same 10: no double-credit.
    await awardMatchMilestones(prisma, 'u1', 10);
    expect(await getBalance(prisma, 'u1')).toBe(10);
    await awardMatchMilestones(prisma, 'u1', 50);
    expect(await getBalance(prisma, 'u1')).toBe(30); // +20
    await awardMatchMilestones(prisma, 'u1', 100);
    expect(await getBalance(prisma, 'u1')).toBe(60); // +30
    await awardMatchMilestones(prisma, 'u1', 250);
    expect(await getBalance(prisma, 'u1')).toBe(110); // +50
    await awardMatchMilestones(prisma, 'u1', 9999);
    expect(await getBalance(prisma, 'u1')).toBe(110); // ceiling
  });
});
