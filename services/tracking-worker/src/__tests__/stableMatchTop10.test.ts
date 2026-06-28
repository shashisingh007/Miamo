/**
 * Unit tests for stableMatchTop10.
 *
 * Covers:
 *   - isoWeekKey (ISO 8601 boundaries, year-roll-over)
 *   - shouldFireNow (Sunday gate + 6-day min interval)
 *   - planTopKForUser (Gale-Shapley correctness, exclusion, top-K cap)
 *   - End-to-end smoke through a stub Prisma capturing the writes.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  StableMatchTop10,
  _internals,
  type PairScoreRow,
} from '../stableMatchTop10';

const { isoWeekKey, shouldFireNow, planTopKForUser } = _internals;

describe('isoWeekKey', () => {
  it('formats 2026-06-21 (Sun) as "2026W25"', () => {
    expect(isoWeekKey(new Date('2026-06-21T00:00:00Z'))).toBe('2026W25');
  });

  it('pads week numbers to 2 digits', () => {
    expect(isoWeekKey(new Date('2026-01-04T00:00:00Z'))).toMatch(/^2026W0[12]$/);
  });

  it('rolls year forward correctly at end-of-year (2025-12-29 → 2026W01)', () => {
    // ISO week 1 of 2026 contains Mon 2025-12-29.
    expect(isoWeekKey(new Date('2025-12-29T00:00:00Z'))).toBe('2026W01');
  });

  it('uses UTC, not local time', () => {
    // Ensure two times on the same UTC day produce the same key, regardless
    // of the runner's TZ.
    const morning = isoWeekKey(new Date('2026-06-21T00:01:00Z'));
    const evening = isoWeekKey(new Date('2026-06-21T23:59:00Z'));
    expect(morning).toBe(evening);
  });
});

describe('shouldFireNow', () => {
  const sunday = new Date('2026-06-21T00:05:00Z');   // Sunday UTC
  const monday = new Date('2026-06-22T00:05:00Z');   // Monday UTC

  it('returns false on a non-Sunday', () => {
    expect(shouldFireNow(monday, null)).toBe(false);
  });

  it('returns true on Sunday with no prior run', () => {
    expect(shouldFireNow(sunday, null)).toBe(true);
  });

  it('returns false if the last run was less than 6 days ago', () => {
    const fiveDaysAgo = new Date(sunday.getTime() - 5 * 86_400_000);
    expect(shouldFireNow(sunday, fiveDaysAgo)).toBe(false);
  });

  it('returns true if the last run was more than 6 days ago', () => {
    const eightDaysAgo = new Date(sunday.getTime() - 8 * 86_400_000);
    expect(shouldFireNow(sunday, eightDaysAgo)).toBe(true);
  });

  it('honours the configurable minIntervalDays', () => {
    const oneDayAgo = new Date(sunday.getTime() - 1 * 86_400_000);
    expect(shouldFireNow(sunday, oneDayAgo, 0)).toBe(true);
    expect(shouldFireNow(sunday, oneDayAgo, 2)).toBe(false);
  });
});

describe('planTopKForUser', () => {
  const me = 'meHash';
  const edges = (entries: Array<[string, string, number]>): PairScoreRow[] =>
    entries.map(([a, b, s]) => ({ aHash: a, bHash: b, score: s }));

  it('returns an empty list when there are no edges', () => {
    expect(planTopKForUser(me, [], new Set(), 50, 10)).toEqual([]);
  });

  it('returns targets sorted by forward score desc', () => {
    const out = planTopKForUser(me, edges([
      [me, 'A', 0.5],
      [me, 'B', 0.9],
      [me, 'C', 0.7],
    ]), new Set(), 50, 10);
    expect(out.map((r) => r.targetHash)).toEqual(['B', 'C', 'A']);
    expect(out.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it('caps the output at topKOut', () => {
    const e: PairScoreRow[] = [];
    for (let i = 0; i < 30; i++) e.push({ aHash: me, bHash: `T${i}`, score: 100 - i });
    const out = planTopKForUser(me, e, new Set(), 50, 10);
    expect(out).toHaveLength(10);
    expect(out[0].targetHash).toBe('T0');
    expect(out[9].targetHash).toBe('T9');
  });

  it('respects the excluded set (passed targets in last 30d)', () => {
    const out = planTopKForUser(me, edges([
      [me, 'A', 0.5],
      [me, 'B', 0.9],
      [me, 'C', 0.7],
    ]), new Set(['B']), 50, 10);
    expect(out.map((r) => r.targetHash)).toEqual(['C', 'A']);
  });

  it('handles edges where me is on the right-hand side (bHash)', () => {
    const out = planTopKForUser(me, edges([
      ['A', me, 0.5],
      ['B', me, 0.9],
    ]), new Set(), 50, 10);
    expect(out.map((r) => r.targetHash)).toEqual(['B', 'A']);
  });

  it('limits the proposer pref list to topKPropose', () => {
    const e: PairScoreRow[] = [];
    for (let i = 0; i < 60; i++) e.push({ aHash: me, bHash: `T${i}`, score: 100 - i });
    const out = planTopKForUser(me, e, new Set(), 5, 5);
    // topKPropose=5 ⇒ proposer only proposes to top 5; output list still
    // shows top 5 by forward score.
    expect(out).toHaveLength(5);
    expect(out.map((r) => r.targetHash)).toEqual(['T0', 'T1', 'T2', 'T3', 'T4']);
  });

  it('produces deterministic output for tied scores (alphabetical tie-break)', () => {
    const out = planTopKForUser(me, edges([
      [me, 'B', 0.5],
      [me, 'A', 0.5],
      [me, 'C', 0.5],
    ]), new Set(), 50, 10);
    expect(out.map((r) => r.targetHash)).toEqual(['A', 'B', 'C']);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// End-to-end smoke through the class — exercises the Sunday gate and the
// per-user idempotency check.
// ─────────────────────────────────────────────────────────────────────────

class StubPrisma {
  queries: Array<{ sql: string; params: unknown[] }> = [];
  activeUsers: Array<{ userId: string }> = [];
  pairs: Array<{ aHash: string; bHash: string; score: number }> = [];
  passed: Array<{ targetId: string | null }> = [];
  alreadyHasWeek = false;
  optedIn = true;

  async $queryRawUnsafe(sql: string, ...params: unknown[]): Promise<unknown> {
    this.queries.push({ sql, params });
    if (sql.includes('GROUP BY "userId"') && sql.includes('UserActivity')) return this.activeUsers;
    if (sql.includes('FROM "WeeklyTopMatch"') && sql.includes('LIMIT 1')) {
      return this.alreadyHasWeek ? [{}] : [];
    }
    if (sql.includes('FROM "Settings"')) {
      return this.optedIn ? [{ discoverPaused: false }] : [{ discoverPaused: true }];
    }
    if (sql.includes('FROM "PairCompatCache"')) return this.pairs;
    if (sql.includes('FROM "UserActivity"') && sql.includes("'pass'")) return this.passed;
    return [];
  }
  async $executeRawUnsafe(sql: string, ...params: unknown[]): Promise<number> {
    this.queries.push({ sql, params });
    return 1;
  }
}

describe('StableMatchTop10.tick (stub Prisma)', () => {
  beforeEach(() => {
    _internals.counters.stableMatchTop10_runs_total = 0;
    _internals.counters.stableMatchTop10_writes_total = 0;
    _internals.counters.stableMatchTop10_errors_total = 0;
    _internals.counters.stableMatchTop10_users_processed_total = 0;
    _internals.counters.stableMatchTop10_users_skipped_idempotent_total = 0;
  });

  const sundayNow = new Date('2026-06-21T00:05:00Z');

  it('skips entirely on a non-Sunday (no queries, no counter bump)', async () => {
    const stub = new StubPrisma();
    const s = new StableMatchTop10(stub as unknown as never);
    const written = await s.tick(new Date('2026-06-22T00:05:00Z')); // Mon
    expect(written).toBe(0);
    expect(stub.queries).toHaveLength(0);
    expect(_internals.counters.stableMatchTop10_runs_total).toBe(0);
  });

  it('writes rows on a Sunday when no prior week computation exists', async () => {
    const stub = new StubPrisma();
    stub.activeUsers = [{ userId: 'u1' }];
    stub.pairs = [
      { aHash: 'meHash', bHash: 'X', score: 0.9 },
      { aHash: 'meHash', bHash: 'Y', score: 0.8 },
    ];
    // Force planTopKForUser to actually find me by aliasing uidHash; we
    // use a dummy hash here — the test only asserts the writer path runs.
    // Replace the aHash with the real uidHash for 'u1'.
    const { hashUid } = await import('../../../shared/src/track/hash');
    const myHash = hashUid('u1');
    stub.pairs = [
      { aHash: myHash, bHash: 'X', score: 0.9 },
      { aHash: myHash, bHash: 'Y', score: 0.8 },
    ];
    const s = new StableMatchTop10(stub as unknown as never);
    const written = await s.tick(sundayNow);
    expect(written).toBeGreaterThan(0);
    const inserts = stub.queries.filter((q) => q.sql.includes('INSERT INTO "WeeklyTopMatch"'));
    expect(inserts.length).toBeGreaterThan(0);
    expect(_internals.counters.stableMatchTop10_writes_total).toBe(inserts.length);
  });

  it('skips users who already have a row for this weekIso (idempotency)', async () => {
    const stub = new StubPrisma();
    stub.activeUsers = [{ userId: 'u1' }];
    stub.alreadyHasWeek = true;
    const s = new StableMatchTop10(stub as unknown as never);
    await s.tick(sundayNow);
    expect(_internals.counters.stableMatchTop10_users_skipped_idempotent_total).toBe(1);
    const inserts = stub.queries.filter((q) => q.sql.includes('INSERT INTO "WeeklyTopMatch"'));
    expect(inserts).toHaveLength(0);
  });

  it('skips users opted out of Discover', async () => {
    const stub = new StubPrisma();
    stub.activeUsers = [{ userId: 'u1' }];
    stub.optedIn = false;
    const s = new StableMatchTop10(stub as unknown as never);
    await s.tick(sundayNow);
    const inserts = stub.queries.filter((q) => q.sql.includes('INSERT INTO "WeeklyTopMatch"'));
    expect(inserts).toHaveLength(0);
  });

  it('updates lastRunAt after firing and gates re-entry within the min interval', async () => {
    const stub = new StubPrisma();
    const s = new StableMatchTop10(stub as unknown as never);
    await s.tick(sundayNow);
    expect(s.getLastRunAt()).toEqual(sundayNow);
    // A re-tick 5 minutes later (still Sunday) should be gated by min-interval.
    const fiveMinLater = new Date(sundayNow.getTime() + 5 * 60_000);
    const written = await s.tick(fiveMinLater);
    expect(written).toBe(0);
  });

  it('isEnabled() returns false by default (STABLE_MATCH_ENABLED unset)', () => {
    const s = new StableMatchTop10({} as unknown as never);
    expect(s.isEnabled()).toBe(false);
  });
});
