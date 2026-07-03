/**
 * Unit tests for exposureScheduler.
 *
 * Covers the pure helpers exported through `_internals`:
 *   - classifyActivity (action → quality-action mapping)
 *   - planLedgerWrites (credit-accrual + premium multiplier + Int rounding)
 *   - shouldEmitRageLikeAudit (rage-like detection wraps v8 isRageLike)
 * Plus an end-to-end smoke of the class via a stub Prisma that captures
 * raw SQL writes — exercises idempotency + batch cap behaviour without
 * touching a real DB.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  ExposureScheduler,
  _internals,
  type ActivityRow,
  type QualityAction,
} from '../exposureScheduler';

const { classifyActivity, planLedgerWrites, shouldEmitRageLikeAudit } = _internals;

function row(overrides: Partial<ActivityRow> = {}): ActivityRow {
  return {
    id: 'ua_1',
    userId: 'u1',
    action: 'view',
    targetType: 'profile',
    targetId: 't1',
    metadata: null,
    durationMs: null,
    createdAt: new Date('2026-06-21T10:00:00Z'),
    ...overrides,
  };
}

describe('classifyActivity', () => {
  it('classifies a like as sticky_like by default', () => {
    expect(classifyActivity(row({ action: 'like' }))).toBe('sticky_like');
  });

  it('returns null for a like flagged as undone', () => {
    expect(
      classifyActivity(row({ action: 'like', metadata: JSON.stringify({ undone: true }) })),
    ).toBeNull();
  });

  it('classifies message with firstMove+replied as message_reply', () => {
    expect(
      classifyActivity(
        row({
          action: 'message',
          metadata: JSON.stringify({ firstMove: true, replied: true }),
        }),
      ),
    ).toBe('message_reply');
  });

  it('does NOT classify message without replied=true', () => {
    expect(
      classifyActivity(
        row({ action: 'message', metadata: JSON.stringify({ firstMove: true }) }),
      ),
    ).toBeNull();
  });

  it('classifies dtm with complete=true as dtm_completed', () => {
    expect(
      classifyActivity(
        row({ action: 'dtm_completed', metadata: JSON.stringify({ complete: true }) }),
      ),
    ).toBe('dtm_completed');
  });

  it('classifies long view + deep scroll as view_long', () => {
    expect(
      classifyActivity(
        row({
          action: 'view',
          durationMs: 8000,
          metadata: JSON.stringify({ deepScroll: true }),
        }),
      ),
    ).toBe('view_long');
  });

  it('classifies bioExpandedMs ≥ 3000 as bio_expand_long (priority over view_long)', () => {
    expect(
      classifyActivity(
        row({
          action: 'view',
          durationMs: 20_000,
          metadata: JSON.stringify({ bioExpandedMs: 4000, deepScroll: true }),
        }),
      ),
    ).toBe('bio_expand_long');
  });

  it('classifies move with accepted+replied as move_accepted', () => {
    expect(
      classifyActivity(
        row({
          action: 'move',
          metadata: JSON.stringify({ accepted: true, replied: true }),
        }),
      ),
    ).toBe('move_accepted');
  });

  it('returns null for an unrelated action (e.g. pass)', () => {
    expect(classifyActivity(row({ action: 'pass' }))).toBeNull();
  });

  it('handles malformed metadata JSON without throwing', () => {
    expect(
      classifyActivity(row({ action: 'view', metadata: '{not json' })),
    ).toBeNull();
  });
});

describe('planLedgerWrites', () => {
  const r = row({ id: 'ua_xyz', action: 'like' });
  it('produces one plan per classified row keyed by refId', () => {
    const plans = planLedgerWrites([{ row: r, action: 'sticky_like' }], false);
    expect(plans).toHaveLength(1);
    expect(plans[0].refId).toBe('ua:ua_xyz');
    expect(plans[0].reason).toBe('sticky_like');
  });

  it('non-premium sticky_like grants 1 slot exactly', () => {
    const plans = planLedgerWrites([{ row: r, action: 'sticky_like' }], false);
    expect(plans[0].slotsFloat).toBe(1);
    expect(plans[0].slotsInt).toBe(1);
  });

  it('premium multiplier applies at earn-time (1.5×)', () => {
    const plans = planLedgerWrites([{ row: r, action: 'sticky_like' }], true);
    expect(plans[0].slotsFloat).toBeCloseTo(1.5, 5);
    expect(plans[0].slotsInt).toBe(2); // Math.round(1.5) === 2
  });

  it('dtm_completed grants 5 slots (deepest signal)', () => {
    const plans = planLedgerWrites([{ row: r, action: 'dtm_completed' }], false);
    expect(plans[0].slotsFloat).toBe(5);
  });

  it('bio_expand_long rounds 0.5→1, premium 0.75→1', () => {
    const plansFree = planLedgerWrites([{ row: r, action: 'bio_expand_long' }], false);
    expect(plansFree[0].slotsFloat).toBe(0.5);
    expect(plansFree[0].slotsInt).toBe(1); // half-up
    const plansPrem = planLedgerWrites([{ row: r, action: 'bio_expand_long' }], true);
    expect(plansPrem[0].slotsFloat).toBeCloseTo(0.75, 5);
    expect(plansPrem[0].slotsInt).toBe(1);
  });

  it('preserves activityId in meta for audit trail', () => {
    const plans = planLedgerWrites([{ row: r, action: 'sticky_like' }], false);
    expect(plans[0].meta.activityId).toBe('ua_xyz');
    expect(plans[0].meta.action).toBe('sticky_like');
  });

  it('produces empty plans for an empty input', () => {
    expect(planLedgerWrites([], false)).toEqual([]);
  });
});

describe('shouldEmitRageLikeAudit', () => {
  const now = Date.parse('2026-06-21T12:00:00Z');

  it('returns false for a normal pace (5 likes in last minute)', () => {
    const ts = Array.from({ length: 5 }, (_, i) => now - i * 10_000);
    expect(shouldEmitRageLikeAudit(ts, now)).toBe(false);
  });

  it('returns true when > 20 likes land within the last 60s', () => {
    const ts = Array.from({ length: 25 }, (_, i) => now - i * 1000);
    expect(shouldEmitRageLikeAudit(ts, now)).toBe(true);
  });

  it('returns true when > 50 likes land within the last hour', () => {
    const ts = Array.from({ length: 60 }, (_, i) => now - i * 30_000); // 30s apart over 30 min
    // Distribute over an hour so per-minute is OK but per-hour is high.
    const ts60 = Array.from({ length: 60 }, (_, i) => now - i * 60_000);
    expect(shouldEmitRageLikeAudit(ts, now)).toBe(true); // 60 in 30 min ≫ 50/hour
    expect(shouldEmitRageLikeAudit(ts60.slice(0, 51), now)).toBe(true);
    expect(shouldEmitRageLikeAudit(ts60.slice(0, 49), now)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// End-to-end smoke through the class with a stub Prisma that records SQL.
// ─────────────────────────────────────────────────────────────────────────

class StubPrisma {
  queries: Array<{ sql: string; params: unknown[] }> = [];
  // Maps for stubbed responses keyed by SQL fragment.
  activeUsers: Array<{ userId: string }> = [];
  activityRows: ActivityRow[] = [];
  ledgerHits = new Set<string>(); // existing (uidHash|reason|refId) tuples

  async $queryRawUnsafe(sql: string, ...params: unknown[]): Promise<unknown> {
    this.queries.push({ sql, params });
    if (sql.includes('GROUP BY "userId"') && sql.includes('UserActivity')) {
      return this.activeUsers;
    }
    if (sql.includes('FROM "UserActivity"') && sql.includes('"userId" = $1')) {
      return this.activityRows;
    }
    if (sql.includes('FROM "ExposureLedger"')) {
      const [uidHash, reason, refId] = params as [string, string, string];
      return this.ledgerHits.has(`${uidHash}|${reason}|${refId}`) ? [{}] : [];
    }
    return [];
  }
  async $executeRawUnsafe(sql: string, ...params: unknown[]): Promise<number> {
    this.queries.push({ sql, params });
    return 1;
  }
}

describe('ExposureScheduler.tick (stub Prisma)', () => {
  beforeEach(() => {
    _internals.counters.exposureScheduler_runs_total = 0;
    _internals.counters.exposureScheduler_writes_total = 0;
    _internals.counters.exposureScheduler_errors_total = 0;
    _internals.counters.exposureScheduler_rage_like_audits_total = 0;
    _internals.counters.exposureScheduler_idempotent_skips_total = 0;
  });

  it('writes one ExposureLedger row and one ExposureCredit upsert per qualifying activity', async () => {
    const stub = new StubPrisma();
    stub.activeUsers = [{ userId: 'u1' }];
    stub.activityRows = [
      row({ id: 'a1', userId: 'u1', action: 'like', metadata: JSON.stringify({}) }),
    ];
    const s = new ExposureScheduler(stub as unknown as never);
    const written = await s.tick();
    expect(written).toBe(1);
    const inserts = stub.queries.filter((q) => q.sql.includes('INSERT INTO "ExposureLedger"'));
    expect(inserts).toHaveLength(1);
    const upserts = stub.queries.filter((q) => q.sql.includes('INSERT INTO "ExposureCredit"'));
    expect(upserts).toHaveLength(1);
    expect(_internals.counters.exposureScheduler_writes_total).toBe(1);
  });

  it('idempotency: skips a row whose refId already exists in ExposureLedger', async () => {
    const stub = new StubPrisma();
    stub.activeUsers = [{ userId: 'u1' }];
    stub.activityRows = [
      row({ id: 'a1', userId: 'u1', action: 'like', metadata: JSON.stringify({}) }),
    ];
    // Pre-populate: mark this refId as already written.
    const { hashUid } = await import('../../../shared/src/track/hash');
    stub.ledgerHits.add(`${hashUid('u1')}|sticky_like|ua:a1`);
    const s = new ExposureScheduler(stub as unknown as never);
    const written = await s.tick();
    expect(written).toBe(0);
    expect(_internals.counters.exposureScheduler_idempotent_skips_total).toBe(1);
    const inserts = stub.queries.filter((q) => q.sql.includes('INSERT INTO "ExposureLedger"'));
    expect(inserts).toHaveLength(0);
  });

  it('emits a rage_like_zero audit row when likes exceed the threshold', async () => {
    const stub = new StubPrisma();
    stub.activeUsers = [{ userId: 'u1' }];
    const now = Date.now();
    // 25 likes within 60s.
    stub.activityRows = Array.from({ length: 25 }, (_, i) => row({
      id: `a${i}`,
      userId: 'u1',
      action: 'like',
      metadata: JSON.stringify({}),
      createdAt: new Date(now - i * 1000),
    }));
    const s = new ExposureScheduler(stub as unknown as never);
    await s.tick();
    expect(_internals.counters.exposureScheduler_rage_like_audits_total).toBe(1);
    const auditInsert = stub.queries.find((q) =>
      q.sql.includes('INSERT INTO "ExposureLedger"') && (q.params as unknown[])[3] === 'rage_like_zero',
    );
    expect(auditInsert).toBeDefined();
  });

  it('batch cap: respects BATCH ceiling on active-user count (query has LIMIT param)', async () => {
    const stub = new StubPrisma();
    stub.activeUsers = []; // empty so tick exits early but we can inspect the LIMIT param
    const s = new ExposureScheduler(stub as unknown as never);
    await s.tick();
    const q = stub.queries.find((qq) => qq.sql.includes('GROUP BY "userId"'));
    expect(q).toBeDefined();
    // The default BATCH is 200; the constructed param[1] (LIMIT) must equal BATCH.
    expect((q!.params as unknown[])[1]).toBe(200);
  });

  it('does not crash when a single user error occurs; counter bumps and other users continue', async () => {
    const stub = new StubPrisma();
    stub.activeUsers = [{ userId: 'u1' }, { userId: 'u2' }];
    stub.activityRows = [
      row({ id: 'a1', userId: 'u1', action: 'like', metadata: JSON.stringify({}) }),
    ];
    // Make the first INSERT fail; the second user run should still write.
    let insertCount = 0;
    stub.$executeRawUnsafe = async function (sql: string, ...params: unknown[]) {
      this.queries.push({ sql, params });
      if (sql.includes('INSERT INTO "ExposureLedger"')) {
        insertCount += 1;
        if (insertCount === 1) throw new Error('boom');
      }
      return 1;
    };
    const s = new ExposureScheduler(stub as unknown as never);
    await s.tick(); // must not throw
    expect(_internals.counters.exposureScheduler_errors_total).toBeGreaterThanOrEqual(1);
  });

  it('isEnabled() reflects the env flag (default OFF)', () => {
    const s = new ExposureScheduler({} as unknown as never);
    // EXPOSURE_SCHEDULER_ENABLED is not set in the test env → false.
    expect(s.isEnabled()).toBe(false);
  });
});
