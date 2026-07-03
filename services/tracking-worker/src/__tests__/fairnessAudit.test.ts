/**
 * Unit tests for fairnessAudit.
 *
 * Covers:
 *   - normaliseGender (closed-set mapping)
 *   - bucketsOverThreshold (alert-trigger logic)
 *   - shouldFireNow (hour-of-day gate + min interval)
 *   - buildFairnessCandidates (row → candidate projection)
 *   - End-to-end smoke through a stub Prisma — exercises the AuditLog
 *     write path and the alert-counter bump.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  FairnessAudit,
  _internals,
  type ImpressionAggRow,
} from '../fairnessAudit';
import { genderConditionalGini } from '../../../shared/src/algo/v8/fairnessRerank';

const {
  shouldFireNow,
  buildFairnessCandidates,
  bucketsOverThreshold,
  normaliseGender,
} = _internals;

describe('normaliseGender', () => {
  it('maps "male"/"man"/"m" → "m"', () => {
    expect(normaliseGender('male')).toBe('m');
    expect(normaliseGender('Man')).toBe('m');
    expect(normaliseGender('M')).toBe('m');
  });
  it('maps "female"/"woman"/"f" → "f"', () => {
    expect(normaliseGender('female')).toBe('f');
    expect(normaliseGender('Woman')).toBe('f');
    expect(normaliseGender('F')).toBe('f');
  });
  it('maps "other"/"nonbinary"/"non-binary" → "o"', () => {
    expect(normaliseGender('other')).toBe('o');
    expect(normaliseGender('nonbinary')).toBe('o');
    expect(normaliseGender('non-binary')).toBe('o');
  });
  it('returns null for unknown or empty values', () => {
    expect(normaliseGender('xyz')).toBeNull();
    expect(normaliseGender('')).toBeNull();
    expect(normaliseGender(null)).toBeNull();
    expect(normaliseGender(undefined)).toBeNull();
  });
});

describe('bucketsOverThreshold', () => {
  it('returns empty when all buckets are below the threshold', () => {
    expect(bucketsOverThreshold({ m: 0.30, f: 0.30, o: 0.30 }, 0.45)).toEqual([]);
  });
  it('returns the buckets that exceed the threshold', () => {
    expect(bucketsOverThreshold({ m: 0.5, f: 0.3, o: 0.5 }, 0.45)).toEqual(['m', 'o']);
  });
  it('uses strict greater-than (threshold itself is OK)', () => {
    expect(bucketsOverThreshold({ m: 0.45, f: 0.45, o: 0.45 }, 0.45)).toEqual([]);
  });
});

describe('shouldFireNow', () => {
  const target02 = new Date('2026-06-21T02:30:00Z');
  const target03 = new Date('2026-06-21T03:00:00Z');

  it('returns false when not at the target hour', () => {
    expect(shouldFireNow(target03, null)).toBe(false);
  });
  it('returns true at the target hour with no prior run', () => {
    expect(shouldFireNow(target02, null)).toBe(true);
  });
  it('returns false when the last run was less than 23h ago', () => {
    const lastRun = new Date(target02.getTime() - 10 * 60 * 60 * 1000); // 10h ago
    expect(shouldFireNow(target02, lastRun)).toBe(false);
  });
  it('returns true when the last run was more than 23h ago', () => {
    const lastRun = new Date(target02.getTime() - 24 * 60 * 60 * 1000); // 24h ago
    expect(shouldFireNow(target02, lastRun)).toBe(true);
  });
  it('honours a custom targetHourUtc', () => {
    const noon = new Date('2026-06-21T12:30:00Z');
    expect(shouldFireNow(noon, null, 12)).toBe(true);
    expect(shouldFireNow(noon, null, 2)).toBe(false);
  });
});

describe('buildFairnessCandidates', () => {
  it('projects rows into the FairnessCandidate shape', () => {
    const rows: ImpressionAggRow[] = [
      { uidHash: 'a', impressions: 10, gender: 'm' },
      { uidHash: 'b', impressions: 5,  gender: 'f' },
      { uidHash: 'c', impressions: 1,  gender: null },
    ];
    const out = buildFairnessCandidates(rows);
    expect(out).toHaveLength(3);
    expect(out[0].targetHash).toBe('a');
    expect(out[0].exposureCountLast7d).toBe(10);
    expect(out[0].gender).toBe('m');
    expect(out[2].gender).toBeNull();
  });

  it('coerces negative impressions to 0', () => {
    const out = buildFairnessCandidates([
      { uidHash: 'a', impressions: -3, gender: 'm' },
    ]);
    expect(out[0].exposureCountLast7d).toBe(0);
  });

  it('plays correctly with genderConditionalGini end-to-end', () => {
    const rows: ImpressionAggRow[] = [
      { uidHash: 'a', impressions: 100, gender: 'm' },
      { uidHash: 'b', impressions: 100, gender: 'm' },
      { uidHash: 'c', impressions: 100, gender: 'f' },
      { uidHash: 'd', impressions: 100, gender: 'f' },
    ];
    const g = genderConditionalGini(buildFairnessCandidates(rows));
    expect(g.m).toBe(0); // perfectly equal
    expect(g.f).toBe(0);
  });

  it('computes a positive Gini for unequal distributions', () => {
    const rows: ImpressionAggRow[] = [
      { uidHash: 'a', impressions: 300, gender: 'm' },
      { uidHash: 'b', impressions: 0,   gender: 'm' },
      { uidHash: 'c', impressions: 0,   gender: 'm' },
    ];
    const g = genderConditionalGini(buildFairnessCandidates(rows));
    expect(g.m).toBeGreaterThan(0.5); // strong inequality
  });
});

// ─────────────────────────────────────────────────────────────────────────
// End-to-end smoke through the class with a stub Prisma.
// ─────────────────────────────────────────────────────────────────────────

class StubPrisma {
  queries: Array<{ sql: string; params: unknown[] }> = [];
  aggRows: Array<{ uidHash: string; impressions: number }> = [];
  profileRows: Array<{ userId: string; gender: string }> = [];
  userRow: { id: string } | null = null;

  async $queryRawUnsafe(sql: string, ...params: unknown[]): Promise<unknown> {
    this.queries.push({ sql, params });
    if (sql.includes('FROM "EventAggDaily"')) return this.aggRows;
    if (sql.includes('FROM "Profile" p')) return this.profileRows;
    if (sql.includes('FROM "User"')) return this.userRow ? [this.userRow] : [];
    return [];
  }
  async $executeRawUnsafe(sql: string, ...params: unknown[]): Promise<number> {
    this.queries.push({ sql, params });
    return 1;
  }
}

describe('FairnessAudit.tick (stub Prisma)', () => {
  beforeEach(() => {
    _internals.counters.fairnessAudit_runs_total = 0;
    _internals.counters.fairnessAudit_writes_total = 0;
    _internals.counters.fairnessAudit_errors_total = 0;
    _internals.counters.fairnessAudit_alerts_total = 0;
    _internals.counters.fairnessAudit_users_audited_total = 0;
  });

  const at02 = new Date('2026-06-21T02:30:00Z');

  it('skips entirely outside the target hour', async () => {
    const stub = new StubPrisma();
    const f = new FairnessAudit(stub as unknown as never);
    await f.tick(new Date('2026-06-21T03:00:00Z'));
    expect(stub.queries).toHaveLength(0);
    expect(_internals.counters.fairnessAudit_runs_total).toBe(0);
  });

  it('writes an AuditLog row at the target hour with no alert (balanced exposure)', async () => {
    const stub = new StubPrisma();
    stub.userRow = { id: 'sys-user-1' };
    // Balanced — all genders see ≈10 impressions each.
    stub.aggRows = [
      { uidHash: 'h1', impressions: 10 },
      { uidHash: 'h2', impressions: 10 },
      { uidHash: 'h3', impressions: 10 },
      { uidHash: 'h4', impressions: 10 },
    ];
    // Bind profile rows whose userId hashes match those uidHashes — for
    // the smoke we just need the hash join not to crash; impressions match
    // pre-existing uidHash regardless of profile join.
    stub.profileRows = [];
    const f = new FairnessAudit(stub as unknown as never);
    const wrote = await f.tick(at02);
    expect(wrote).toBe(1);
    expect(_internals.counters.fairnessAudit_writes_total).toBe(1);
    const auditInsert = stub.queries.find((q) =>
      q.sql.includes('INSERT INTO "AuditLog"'),
    );
    expect(auditInsert).toBeDefined();
    // action = 'fairness_audit'
    expect((auditInsert!.params as unknown[])[1]).toBe('fairness_audit');
  });

  it('counts users audited (uniq uidHash count)', async () => {
    const stub = new StubPrisma();
    stub.userRow = { id: 'sys-user-1' };
    stub.aggRows = [
      { uidHash: 'h1', impressions: 1 },
      { uidHash: 'h2', impressions: 1 },
      { uidHash: 'h3', impressions: 1 },
    ];
    const f = new FairnessAudit(stub as unknown as never);
    await f.tick(at02);
    expect(_internals.counters.fairnessAudit_users_audited_total).toBe(3);
  });

  it('bumps the alert counter when a gender bucket exceeds threshold', async () => {
    const stub = new StubPrisma();
    stub.userRow = { id: 'sys-user-1' };
    // Heavy skew within the 'm' bucket. We have to align uidHash → Profile
    // so the join produces the gender. The fairness-audit class hashes
    // Profile.userId on the way in.
    const { hashUid } = await import('../../../shared/src/track/hash');
    stub.profileRows = [
      { userId: 'um1', gender: 'male' },
      { userId: 'um2', gender: 'male' },
      { userId: 'um3', gender: 'male' },
      { userId: 'uf1', gender: 'female' },
      { userId: 'uf2', gender: 'female' },
    ];
    stub.aggRows = [
      { uidHash: hashUid('um1'), impressions: 1000 },
      { uidHash: hashUid('um2'), impressions: 0 },
      { uidHash: hashUid('um3'), impressions: 0 },
      { uidHash: hashUid('uf1'), impressions: 5 },
      { uidHash: hashUid('uf2'), impressions: 5 },
    ];
    const f = new FairnessAudit(stub as unknown as never);
    await f.tick(at02);
    expect(_internals.counters.fairnessAudit_alerts_total).toBe(1);
  });

  it('falls back to first User when no FAIRNESS_AUDIT_SYSTEM_USER_ID is set', async () => {
    const stub = new StubPrisma();
    stub.userRow = { id: 'fallback-user' };
    stub.aggRows = [{ uidHash: 'h1', impressions: 10 }];
    const f = new FairnessAudit(stub as unknown as never);
    await f.tick(at02);
    const auditInsert = stub.queries.find((q) =>
      q.sql.includes('INSERT INTO "AuditLog"'),
    );
    expect(auditInsert).toBeDefined();
    expect((auditInsert!.params as unknown[])[0]).toBe('fallback-user');
  });

  it('skips the DB write when no fallback user exists, but still counts the run', async () => {
    const stub = new StubPrisma();
    stub.userRow = null;
    stub.aggRows = [{ uidHash: 'h1', impressions: 10 }];
    const f = new FairnessAudit(stub as unknown as never);
    const wrote = await f.tick(at02);
    expect(wrote).toBe(0);
    expect(_internals.counters.fairnessAudit_runs_total).toBe(1);
    const auditInsert = stub.queries.find((q) =>
      q.sql.includes('INSERT INTO "AuditLog"'),
    );
    expect(auditInsert).toBeUndefined();
  });

  it('does not double-fire within the min-interval window on the same hour', async () => {
    const stub = new StubPrisma();
    stub.userRow = { id: 'sys-user-1' };
    stub.aggRows = [{ uidHash: 'h1', impressions: 10 }];
    const f = new FairnessAudit(stub as unknown as never);
    await f.tick(at02);
    expect(_internals.counters.fairnessAudit_runs_total).toBe(1);
    // 10 minutes later — still in the target hour but inside min-interval gate.
    const later = new Date(at02.getTime() + 10 * 60_000);
    await f.tick(later);
    expect(_internals.counters.fairnessAudit_runs_total).toBe(1);
  });

  it('isEnabled() returns false by default (FAIRNESS_AUDIT_ENABLED unset)', () => {
    const f = new FairnessAudit({} as unknown as never);
    expect(f.isEnabled()).toBe(false);
  });
});
