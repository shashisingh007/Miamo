// v3.5.1 hotfix tests — hard-filter passed profiles in the Discover pool.
//
// We test the helper that produces the NOT-IN list rather than the full HTTP
// route, because the route stitches together ~25 prisma tables, the v4 ranker,
// the negative-signal engine, intent classifier, and diversifier. Testing the
// helper in isolation is enough to lock in the behavioral contract — the
// route just feeds the helper's output into the existing `blockedIds` array
// which is already exercised end-to-end by phase-* QA scripts.

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getRecentPassedTargetIds,
  isPassHardfilterEnabled,
  PASS_LOOKBACK_DAYS,
  PASS_EXCLUSION_CAP,
} from '../services/shared/src/discover-passfilter';

interface ActivityRow {
  userId: string;
  action: string;
  targetId: string | null;
  createdAt: Date;
}

function buildPrisma(rows: ActivityRow[]) {
  return {
    userActivity: {
      async findMany(args: any) {
        const w = args.where;
        let filtered = rows.filter(
          (r) =>
            r.userId === w.userId &&
            r.action === w.action &&
            r.createdAt >= w.createdAt.gte &&
            r.targetId !== null,
        );
        if (args.distinct?.includes('targetId')) {
          const seen = new Set<string>();
          filtered = filtered.filter((r) => {
            if (!r.targetId) return false;
            if (seen.has(r.targetId)) return false;
            seen.add(r.targetId);
            return true;
          });
        }
        if (args.take) filtered = filtered.slice(0, args.take);
        return filtered.map((r) => ({ targetId: r.targetId }));
      },
    },
  };
}

const ME = 'user-me';
const now = new Date('2026-06-24T12:00:00Z');
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400_000);

describe('isPassHardfilterEnabled', () => {
  it('defaults to enabled when env var is unset', () => {
    expect(isPassHardfilterEnabled({} as any)).toBe(true);
  });
  it('stays enabled for any value other than "0"', () => {
    expect(isPassHardfilterEnabled({ DISCOVER_PASS_HARDFILTER_ENABLED: '1' } as any)).toBe(true);
    expect(isPassHardfilterEnabled({ DISCOVER_PASS_HARDFILTER_ENABLED: 'true' } as any)).toBe(true);
  });
  it('disables only on explicit "0"', () => {
    expect(isPassHardfilterEnabled({ DISCOVER_PASS_HARDFILTER_ENABLED: '0' } as any)).toBe(false);
  });
});

describe('getRecentPassedTargetIds — core contract', () => {
  it('returns recently passed targetIds (fixes #1 complaint: "shows me people I already passed")', async () => {
    const prisma = buildPrisma([
      { userId: ME, action: 'pass', targetId: 'X', createdAt: daysAgo(1) },
    ]);
    const ids = await getRecentPassedTargetIds(prisma as any, ME, { now });
    expect(ids).toEqual(['X']);
  });

  it('returns [] when the user has never passed anyone', async () => {
    const prisma = buildPrisma([]);
    const ids = await getRecentPassedTargetIds(prisma as any, ME, { now });
    expect(ids).toEqual([]);
  });

  it('excludes passes older than the 30d lookback window', async () => {
    const prisma = buildPrisma([
      { userId: ME, action: 'pass', targetId: 'Y', createdAt: daysAgo(PASS_LOOKBACK_DAYS + 1) },
      { userId: ME, action: 'pass', targetId: 'Z', createdAt: daysAgo(PASS_LOOKBACK_DAYS - 1) },
    ]);
    const ids = await getRecentPassedTargetIds(prisma as any, ME, { now });
    expect(ids).toEqual(['Z']);
    expect(ids).not.toContain('Y');
  });

  it('includes a pass made exactly at the lookback boundary (gte)', async () => {
    const prisma = buildPrisma([
      { userId: ME, action: 'pass', targetId: 'B', createdAt: daysAgo(PASS_LOOKBACK_DAYS) },
    ]);
    const ids = await getRecentPassedTargetIds(prisma as any, ME, { now });
    expect(ids).toEqual(['B']);
  });

  it('does not include other users\' passes', async () => {
    const prisma = buildPrisma([
      { userId: 'other-user', action: 'pass', targetId: 'X', createdAt: daysAgo(1) },
    ]);
    const ids = await getRecentPassedTargetIds(prisma as any, ME, { now });
    expect(ids).toEqual([]);
  });

  it('only considers action="pass" (likes and views must NOT exclude profiles)', async () => {
    const prisma = buildPrisma([
      { userId: ME, action: 'like', targetId: 'A', createdAt: daysAgo(1) },
      { userId: ME, action: 'view', targetId: 'B', createdAt: daysAgo(1) },
      { userId: ME, action: 'pass', targetId: 'C', createdAt: daysAgo(1) },
    ]);
    const ids = await getRecentPassedTargetIds(prisma as any, ME, { now });
    expect(ids).toEqual(['C']);
  });

  it('deduplicates targetIds when the user passed the same profile multiple times', async () => {
    const prisma = buildPrisma([
      { userId: ME, action: 'pass', targetId: 'X', createdAt: daysAgo(5) },
      { userId: ME, action: 'pass', targetId: 'X', createdAt: daysAgo(3) },
      { userId: ME, action: 'pass', targetId: 'X', createdAt: daysAgo(1) },
    ]);
    const ids = await getRecentPassedTargetIds(prisma as any, ME, { now });
    expect(ids).toEqual(['X']);
  });
});

describe('getRecentPassedTargetIds — feature flag', () => {
  it('returns [] when DISCOVER_PASS_HARDFILTER_ENABLED="0" (rollback path)', async () => {
    const prisma = buildPrisma([
      { userId: ME, action: 'pass', targetId: 'X', createdAt: daysAgo(1) },
    ]);
    const ids = await getRecentPassedTargetIds(prisma as any, ME, {
      now,
      env: { DISCOVER_PASS_HARDFILTER_ENABLED: '0' } as any,
    });
    expect(ids).toEqual([]);
  });

  it('is enabled by default (env unset → flag on)', async () => {
    const prisma = buildPrisma([
      { userId: ME, action: 'pass', targetId: 'X', createdAt: daysAgo(1) },
    ]);
    const ids = await getRecentPassedTargetIds(prisma as any, ME, { now, env: {} as any });
    expect(ids).toEqual(['X']);
  });
});

describe('getRecentPassedTargetIds — safety bounds', () => {
  it('caps the returned list at PASS_EXCLUSION_CAP entries (10k)', async () => {
    // 10_001 distinct passes — the oldest one is allowed to "slip through"
    // and re-appear in Discover. That is an acceptable degradation vs. the
    // original bug (every passed profile shown forever).
    const rows: ActivityRow[] = [];
    for (let i = 0; i < PASS_EXCLUSION_CAP + 1; i++) {
      rows.push({ userId: ME, action: 'pass', targetId: `t${i}`, createdAt: daysAgo(1) });
    }
    const prisma = buildPrisma(rows);
    const ids = await getRecentPassedTargetIds(prisma as any, ME, { now });
    expect(ids.length).toBe(PASS_EXCLUSION_CAP);
  });

  it('returns [] (best-effort) when the prisma query throws', async () => {
    const prisma = {
      userActivity: {
        async findMany() {
          throw new Error('db down');
        },
      },
    };
    const ids = await getRecentPassedTargetIds(prisma as any, ME, { now });
    expect(ids).toEqual([]);
  });
});
