/**
 * Sanity invariants — runtime data-shape rules that MUST hold at all times.
 *
 * Different from smoke (does-it-run) and unit tests (does-this-function-work).
 * These tests codify **structural invariants** across the Prisma schema. They
 * are documentation-as-tests: if any invariant here fails in the future,
 * either a schema migration or a business-logic bug broke a fundamental
 * assumption the rest of the stack depends on.
 *
 * All fixtures are hand-built in-memory — no live DB, no Prisma client.
 * The invariants are checked by running an in-memory validator against
 * plausible + adversarial fixture data:
 *   - "positive" fixtures represent healthy rows and MUST pass.
 *   - "negative" fixtures represent bugs the invariant is designed to catch;
 *     the validator MUST reject them.
 *
 * Cross-refs:
 *   - services/shared/prisma/schema.prisma
 *   - reference_prisma_schema.md (auto-memory, model index)
 *   - FULL_AUDIT_AND_LEARNING_V2_PROMPT.md §G.4
 */

import { describe, it, expect } from 'vitest';

// ─── Minimal typed row shapes (subset of Prisma models) ──────────────────────
// We deliberately duplicate the field surface here rather than import
// Prisma types — this file must run without @prisma/client codegen.

interface SpotlightLedgerRow {
  id: string;
  userId: string;
  delta: number;
  reason: string;
  createdAt: Date;
}

interface MatchRow {
  id: string;
  user1Id: string;
  user2Id: string;
  active: boolean;
  createdAt: Date;
  deletedAt?: Date | null;
}

interface ChatRow {
  id: string;
  matchId: string;
  user1Id: string;
  user2Id: string;
}

interface FeatureSnapshotRow {
  uidHash: string;
  computedAt: Date;
}

interface UserPreferenceHistoryRow {
  id: string;
  uidHash: string;
  dimension: string;
  window: string;
  score: number;
}

interface EventAggHourlyRow {
  uidHash: string;
  evt: string;
  bucket: Date;
  count: number;
}

interface ExposureLedgerRow {
  id: string;
  uidHash: string;
  surface: string;
  deltaSlots: number;
  reason: string;
}

interface DeferredItemRow {
  id: string;
  uidHash: string;
  surface: 'discover' | 'dtm' | string;
  targetId: string;
  topic?: string | null;
}

// ─── Invariant validators (pure functions over row arrays) ───────────────────

/**
 * INV-1: SpotlightLedger balance per user must be non-negative unless a
 * refund is present.
 * // because: the ledger is credit-based; a user can only spend what they've
 * earned. The only way to go negative legitimately is a refund that lands
 * after a spend was already reconciled.
 */
function violatesSpotlightBalance(rows: SpotlightLedgerRow[]): string[] {
  const byUser = new Map<string, SpotlightLedgerRow[]>();
  for (const r of rows) {
    if (!byUser.has(r.userId)) byUser.set(r.userId, []);
    byUser.get(r.userId)!.push(r);
  }
  const violations: string[] = [];
  for (const [uid, userRows] of byUser) {
    const sum = userRows.reduce((acc, r) => acc + r.delta, 0);
    if (sum < 0) {
      const hasRefund = userRows.some((r) => /refund/i.test(r.reason));
      if (!hasRefund) violations.push(`${uid}:balance=${sum}`);
    }
  }
  return violations;
}

/**
 * INV-2: Every active Match has at most one Chat (matchId is unique on Chat).
 * // because: `Chat.matchId @unique` is the schema-level guarantee; runtime
 * writes must not produce duplicates via race conditions.
 */
function chatsPerMatch(chats: ChatRow[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of chats) m.set(c.matchId, (m.get(c.matchId) ?? 0) + 1);
  return m;
}

/**
 * INV-3: No user has more than 1 active Match with the same partner.
 * // because: the (user1Id, user2Id) unique index plus canonical ordering
 * INV-8 ensures a partner-pair is stored exactly once. Duplicate rows imply
 * either the canonical-ordering check failed or the unique index was skipped.
 */
function duplicatePartnerPairs(matches: MatchRow[]): string[] {
  const seen = new Set<string>();
  const dup: string[] = [];
  for (const m of matches) {
    if (!m.active) continue;
    // canonical: min|max
    const [a, b] = m.user1Id < m.user2Id ? [m.user1Id, m.user2Id] : [m.user2Id, m.user1Id];
    const key = a + '|' + b;
    if (seen.has(key)) dup.push(key);
    seen.add(key);
  }
  return dup;
}

/**
 * INV-4: FeatureSnapshot.computedAt is always in the past.
 * // because: the snapshotter uses Date.now() to stamp rows; a future
 * timestamp implies clock drift or a manual insert with a bad literal.
 */
function futureSnapshots(rows: FeatureSnapshotRow[], now: Date): string[] {
  return rows.filter((r) => r.computedAt.getTime() > now.getTime()).map((r) => r.uidHash);
}

/**
 * INV-5: UserPreferenceHistory.score is bounded to [0,1].
 * // because: the tracking-worker preferenceWindows loop normalizes scores
 * with clamp(); an out-of-range value is a corruption of that clamp.
 */
function outOfRangeScores(rows: UserPreferenceHistoryRow[]): UserPreferenceHistoryRow[] {
  return rows.filter((r) => !(r.score >= 0 && r.score <= 1));
}

/**
 * INV-6: EventAggHourly.count is strictly positive when the row exists.
 * // because: the aggregator increments count; rows are never inserted with
 * count=0. A zero-count row is a bug (the increment path skipped a step).
 */
function nonPositiveCounts(rows: EventAggHourlyRow[]): EventAggHourlyRow[] {
  return rows.filter((r) => r.count <= 0);
}

/**
 * INV-7: ExposureLedger sign matches reason — credits are +, spends are -.
 * // because: v8 exposure-credits accounting depends on sign to compute
 * remaining slots; reversed signs would let a user "spend" negative slots
 * (i.e. gain infinite exposure).
 */
const CREDIT_REASONS = new Set([
  'sticky_like', 'message_reply', 'dtm_completed', 'bio_expand', 'view_long',
  'move_accepted', 'admin_grant', 'top10_filled', 'fairness_inject',
]);
const SPEND_REASONS = new Set([
  'rage_like_zero', 'exposure_spend', 'boost_purchase',
]);
function signedIncorrectly(rows: ExposureLedgerRow[]): ExposureLedgerRow[] {
  return rows.filter((r) => {
    if (CREDIT_REASONS.has(r.reason)) return r.deltaSlots <= 0;
    if (SPEND_REASONS.has(r.reason)) return r.deltaSlots >= 0;
    return false; // unknown reason — treat as documentation-only, not a violation
  });
}

/**
 * INV-8: Every Match uses canonical ordering user1Id < user2Id (string cmp).
 * // because: without a canonical ordering, (A,B) and (B,A) look distinct to
 * the (user1Id,user2Id) unique index — duplicate matches would slip through.
 * The Prisma writer must enforce this before insert.
 */
function nonCanonical(rows: MatchRow[]): MatchRow[] {
  return rows.filter((r) => r.user1Id >= r.user2Id);
}

/**
 * INV-9: No Chat points to a soft-deleted Match.
 * // because: soft-deletes should cascade to chats; a dangling chat is a
 * leftover row that will crash the messaging service when it dereferences
 * the match.
 */
function chatsPointingToDeletedMatches(
  chats: ChatRow[],
  matches: MatchRow[],
): ChatRow[] {
  const deleted = new Set(
    matches.filter((m) => m.deletedAt != null).map((m) => m.id),
  );
  return chats.filter((c) => deleted.has(c.matchId));
}

/**
 * INV-10: Every DeferredItem is either surface='discover' with a targetId
 * that looks like a user-id (has content), OR surface='dtm' with a topic
 * present.
 * // because: the discover pile always defers on a user tid; the dtm pile
 * always defers on a qid with a topic. Rows with neither shape are corrupt.
 */
function malformedDeferredItems(rows: DeferredItemRow[]): DeferredItemRow[] {
  return rows.filter((r) => {
    if (r.surface === 'discover') return !r.targetId || r.targetId.length === 0;
    if (r.surface === 'dtm') return !r.topic;
    return true; // unknown surface — treat as violation
  });
}

// ─── Fixture helpers ─────────────────────────────────────────────────────────

function ledger(
  userId: string, delta: number, reason: string, id = crypto.randomUUID(),
): SpotlightLedgerRow {
  return { id, userId, delta, reason, createdAt: new Date() };
}

function matchRow(
  a: string, b: string, opts: Partial<MatchRow> = {},
): MatchRow {
  const [u1, u2] = a < b ? [a, b] : [b, a];
  return {
    id: opts.id ?? crypto.randomUUID(),
    user1Id: u1,
    user2Id: u2,
    active: opts.active ?? true,
    createdAt: opts.createdAt ?? new Date(),
    deletedAt: opts.deletedAt ?? null,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('sanity invariants (§G.4)', () => {
  // Group 1 — SpotlightLedger balance
  describe('INV-1: SpotlightLedger balance ≥ 0 unless refund', () => {
    it('positive fixture: pure credit run has non-negative balance', () => {
      const rows = [
        ledger('u1', 100, 'profile_100'),
        ledger('u1', 20, 'daily_login'),
      ];
      expect(violatesSpotlightBalance(rows)).toEqual([]);
    });

    it('positive fixture: balanced credit + spend passes', () => {
      const rows = [
        ledger('u1', 100, 'profile_100'),
        ledger('u1', -30, 'post_spend'),
      ];
      expect(violatesSpotlightBalance(rows)).toEqual([]);
    });

    it('negative fixture: spending more than earned without refund is flagged', () => {
      const rows = [
        ledger('u1', 10, 'daily_login'),
        ledger('u1', -50, 'post_spend'),
      ];
      const v = violatesSpotlightBalance(rows);
      expect(v).toHaveLength(1);
      expect(v[0]).toMatch(/^u1:/);
    });

    it('positive fixture: negative balance with a refund_oops row is tolerated', () => {
      // refund_oops is the sanctioned way for balance to go negative briefly.
      const rows = [
        ledger('u1', 10, 'daily_login'),
        ledger('u1', -50, 'post_spend'),
        ledger('u1', 25, 'refund_oops'),
      ];
      expect(violatesSpotlightBalance(rows)).toEqual([]);
    });

    it('multiple users: only the underwater one is flagged', () => {
      const rows = [
        ledger('u1', 100, 'profile_100'),
        ledger('u2', 5, 'daily_login'),
        ledger('u2', -20, 'post_spend'),
      ];
      const v = violatesSpotlightBalance(rows);
      expect(v).toHaveLength(1);
      expect(v[0]).toMatch(/^u2:/);
    });
  });

  // Group 2 — Chat / Match relationship
  describe('INV-2: each Match has at most one Chat', () => {
    it('positive fixture: match→single chat is valid', () => {
      const chats: ChatRow[] = [
        { id: 'c1', matchId: 'm1', user1Id: 'a', user2Id: 'b' },
      ];
      const counts = chatsPerMatch(chats);
      expect(counts.get('m1')).toBe(1);
      // No key should map to > 1.
      for (const [, v] of counts) expect(v).toBeLessThanOrEqual(1);
    });

    it('negative fixture: two chats for one match is a violation', () => {
      const chats: ChatRow[] = [
        { id: 'c1', matchId: 'm1', user1Id: 'a', user2Id: 'b' },
        { id: 'c2', matchId: 'm1', user1Id: 'a', user2Id: 'b' },
      ];
      const counts = chatsPerMatch(chats);
      expect(counts.get('m1')).toBe(2);
      const violations = [...counts.entries()].filter(([, n]) => n > 1);
      expect(violations).toHaveLength(1);
    });

    it('positive fixture: match with no chat (declined) is valid', () => {
      const chats: ChatRow[] = [];
      const counts = chatsPerMatch(chats);
      expect(counts.get('m1')).toBeUndefined();
    });
  });

  // Group 3 — No duplicate matches
  describe('INV-3: no duplicate active Match rows for the same pair', () => {
    it('positive fixture: two distinct partner pairs pass', () => {
      const matches = [matchRow('a', 'b'), matchRow('a', 'c')];
      expect(duplicatePartnerPairs(matches)).toEqual([]);
    });

    it('negative fixture: same pair, both active → violation', () => {
      const matches = [matchRow('a', 'b'), matchRow('b', 'a')];
      const dups = duplicatePartnerPairs(matches);
      expect(dups).toHaveLength(1);
    });

    it('positive fixture: one active + one inactive with same pair is tolerated', () => {
      const matches = [matchRow('a', 'b'), matchRow('a', 'b', { active: false })];
      expect(duplicatePartnerPairs(matches)).toEqual([]);
    });
  });

  // Group 4 — FeatureSnapshot computedAt in past
  describe('INV-4: FeatureSnapshot.computedAt < now', () => {
    it('positive fixture: past timestamps pass', () => {
      const now = new Date('2026-01-01T00:00:00Z');
      const rows: FeatureSnapshotRow[] = [
        { uidHash: 'h1', computedAt: new Date('2025-12-31T23:59:00Z') },
      ];
      expect(futureSnapshots(rows, now)).toEqual([]);
    });

    it('negative fixture: future timestamp caught (clock drift or manual insert)', () => {
      const now = new Date('2026-01-01T00:00:00Z');
      const rows: FeatureSnapshotRow[] = [
        { uidHash: 'h1', computedAt: new Date('2027-01-01T00:00:00Z') },
      ];
      expect(futureSnapshots(rows, now)).toEqual(['h1']);
    });

    it('edge case: exactly-now is tolerated (strict future check)', () => {
      const now = new Date('2026-01-01T00:00:00Z');
      const rows: FeatureSnapshotRow[] = [
        { uidHash: 'h1', computedAt: now },
      ];
      // Using > (not >=), so equality is not a violation.
      expect(futureSnapshots(rows, now)).toEqual([]);
    });
  });

  // Group 5 — UserPreferenceHistory.score in [0,1]
  describe('INV-5: UserPreferenceHistory.score ∈ [0,1]', () => {
    it('positive fixture: interior + boundary values pass', () => {
      const rows: UserPreferenceHistoryRow[] = [
        { id: '1', uidHash: 'h', dimension: 'category:x', window: 'week', score: 0 },
        { id: '2', uidHash: 'h', dimension: 'category:x', window: 'week', score: 0.5 },
        { id: '3', uidHash: 'h', dimension: 'category:x', window: 'week', score: 1 },
      ];
      expect(outOfRangeScores(rows)).toEqual([]);
    });

    it('negative fixture: score > 1 (bad normalization) is caught', () => {
      const rows: UserPreferenceHistoryRow[] = [
        { id: '1', uidHash: 'h', dimension: 'x', window: 'week', score: 1.5 },
      ];
      expect(outOfRangeScores(rows)).toHaveLength(1);
    });

    it('negative fixture: negative score (sign flip) is caught', () => {
      const rows: UserPreferenceHistoryRow[] = [
        { id: '1', uidHash: 'h', dimension: 'x', window: 'week', score: -0.01 },
      ];
      expect(outOfRangeScores(rows)).toHaveLength(1);
    });

    it('negative fixture: NaN score is caught (comparison-fails invariant)', () => {
      const rows: UserPreferenceHistoryRow[] = [
        { id: '1', uidHash: 'h', dimension: 'x', window: 'week', score: NaN },
      ];
      expect(outOfRangeScores(rows)).toHaveLength(1);
    });
  });

  // Group 6 — EventAggHourly.count > 0
  describe('INV-6: EventAggHourly.count > 0 when row exists', () => {
    it('positive fixture: any positive count passes', () => {
      const rows: EventAggHourlyRow[] = [
        { uidHash: 'h', evt: 'view', bucket: new Date(), count: 1 },
        { uidHash: 'h', evt: 'view', bucket: new Date(), count: 42 },
      ];
      expect(nonPositiveCounts(rows)).toEqual([]);
    });

    it('negative fixture: zero-count row is a violation (increment skipped)', () => {
      const rows: EventAggHourlyRow[] = [
        { uidHash: 'h', evt: 'view', bucket: new Date(), count: 0 },
      ];
      expect(nonPositiveCounts(rows)).toHaveLength(1);
    });

    it('negative fixture: negative count (corruption) is caught', () => {
      const rows: EventAggHourlyRow[] = [
        { uidHash: 'h', evt: 'view', bucket: new Date(), count: -1 },
      ];
      expect(nonPositiveCounts(rows)).toHaveLength(1);
    });
  });

  // Group 7 — ExposureLedger sign convention
  describe('INV-7: ExposureLedger sign matches reason', () => {
    it('positive fixture: credit reasons produce positive delta', () => {
      const rows: ExposureLedgerRow[] = [
        { id: '1', uidHash: 'h', surface: 'discover', deltaSlots: 5, reason: 'sticky_like' },
        { id: '2', uidHash: 'h', surface: 'discover', deltaSlots: 10, reason: 'admin_grant' },
      ];
      expect(signedIncorrectly(rows)).toEqual([]);
    });

    it('positive fixture: spend reasons produce negative delta', () => {
      const rows: ExposureLedgerRow[] = [
        { id: '1', uidHash: 'h', surface: 'discover', deltaSlots: -3, reason: 'rage_like_zero' },
      ];
      expect(signedIncorrectly(rows)).toEqual([]);
    });

    it('negative fixture: sticky_like with negative delta is a bug', () => {
      const rows: ExposureLedgerRow[] = [
        { id: '1', uidHash: 'h', surface: 'discover', deltaSlots: -5, reason: 'sticky_like' },
      ];
      expect(signedIncorrectly(rows)).toHaveLength(1);
    });

    it('negative fixture: rage_like_zero with positive delta is a bug', () => {
      const rows: ExposureLedgerRow[] = [
        { id: '1', uidHash: 'h', surface: 'discover', deltaSlots: 5, reason: 'rage_like_zero' },
      ];
      expect(signedIncorrectly(rows)).toHaveLength(1);
    });

    it('unknown reason is tolerated (documentation-only)', () => {
      const rows: ExposureLedgerRow[] = [
        { id: '1', uidHash: 'h', surface: 'discover', deltaSlots: 0, reason: 'brand_new_reason' },
      ];
      expect(signedIncorrectly(rows)).toEqual([]);
    });
  });

  // Group 8 — Canonical Match ordering
  describe('INV-8: Match user1Id < user2Id (canonical)', () => {
    it('positive fixture: canonical order via helper always passes', () => {
      const matches = [matchRow('a', 'b'), matchRow('zeb', 'aardvark')];
      expect(nonCanonical(matches)).toEqual([]);
    });

    it('negative fixture: raw insert with user1 >= user2 is caught', () => {
      const bad: MatchRow = {
        id: 'x', user1Id: 'z', user2Id: 'a',
        active: true, createdAt: new Date(),
      };
      expect(nonCanonical([bad])).toHaveLength(1);
    });

    it('negative fixture: equal user ids (self-match) is also invalid', () => {
      const self: MatchRow = {
        id: 'x', user1Id: 'a', user2Id: 'a',
        active: true, createdAt: new Date(),
      };
      expect(nonCanonical([self])).toHaveLength(1);
    });
  });

  // Group 9 — Chat → deleted Match dangling reference
  describe('INV-9: No Chat.matchId points to a soft-deleted Match', () => {
    it('positive fixture: chats only reference live matches', () => {
      const matches = [matchRow('a', 'b', { id: 'm1' })];
      const chats: ChatRow[] = [
        { id: 'c1', matchId: 'm1', user1Id: 'a', user2Id: 'b' },
      ];
      expect(chatsPointingToDeletedMatches(chats, matches)).toEqual([]);
    });

    it('negative fixture: chat pointing to soft-deleted match is dangling', () => {
      const matches = [
        matchRow('a', 'b', { id: 'm1', deletedAt: new Date() }),
      ];
      const chats: ChatRow[] = [
        { id: 'c1', matchId: 'm1', user1Id: 'a', user2Id: 'b' },
      ];
      expect(chatsPointingToDeletedMatches(chats, matches)).toHaveLength(1);
    });
  });

  // Group 10 — DeferredItem shape by surface
  describe('INV-10: DeferredItem shape matches surface', () => {
    it('positive fixture: discover row with tid + no topic is valid', () => {
      const rows: DeferredItemRow[] = [
        { id: '1', uidHash: 'h', surface: 'discover', targetId: 'user-1' },
      ];
      expect(malformedDeferredItems(rows)).toEqual([]);
    });

    it('positive fixture: dtm row with qid + topic is valid', () => {
      const rows: DeferredItemRow[] = [
        { id: '1', uidHash: 'h', surface: 'dtm', targetId: 'qid-1', topic: 'values' },
      ];
      expect(malformedDeferredItems(rows)).toEqual([]);
    });

    it('negative fixture: discover row missing targetId is malformed', () => {
      const rows: DeferredItemRow[] = [
        { id: '1', uidHash: 'h', surface: 'discover', targetId: '' },
      ];
      expect(malformedDeferredItems(rows)).toHaveLength(1);
    });

    it('negative fixture: dtm row missing topic is malformed', () => {
      const rows: DeferredItemRow[] = [
        { id: '1', uidHash: 'h', surface: 'dtm', targetId: 'qid-1' },
      ];
      expect(malformedDeferredItems(rows)).toHaveLength(1);
    });

    it('negative fixture: unknown surface is malformed', () => {
      const rows: DeferredItemRow[] = [
        { id: '1', uidHash: 'h', surface: 'unknown', targetId: 't' },
      ];
      expect(malformedDeferredItems(rows)).toHaveLength(1);
    });
  });

  // Cross-invariant integration — a realistic mixed batch stays clean.
  describe('integration: healthy multi-model batch triggers no invariant', () => {
    it('a realistic 3-user snapshot passes all invariants simultaneously', () => {
      const now = new Date('2026-06-29T12:00:00Z');
      const ledgerRows: SpotlightLedgerRow[] = [
        ledger('u1', 100, 'profile_100'),
        ledger('u2', 30, 'daily_login'),
        ledger('u2', -10, 'post_spend'),
      ];
      const matches = [
        matchRow('u1', 'u2', { id: 'm1' }),
        matchRow('u1', 'u3', { id: 'm2' }),
      ];
      const chats: ChatRow[] = [
        { id: 'c1', matchId: 'm1', user1Id: 'u1', user2Id: 'u2' },
      ];
      const snapshots: FeatureSnapshotRow[] = [
        { uidHash: 'h1', computedAt: new Date('2026-06-29T11:59:00Z') },
      ];
      const prefs: UserPreferenceHistoryRow[] = [
        { id: '1', uidHash: 'h1', dimension: 'category:x', window: 'week', score: 0.42 },
      ];
      const events: EventAggHourlyRow[] = [
        { uidHash: 'h1', evt: 'view', bucket: now, count: 5 },
      ];
      const exposure: ExposureLedgerRow[] = [
        { id: '1', uidHash: 'h1', surface: 'discover', deltaSlots: 2, reason: 'sticky_like' },
      ];
      const deferred: DeferredItemRow[] = [
        { id: '1', uidHash: 'h1', surface: 'discover', targetId: 'u3' },
      ];

      expect(violatesSpotlightBalance(ledgerRows)).toEqual([]);
      expect([...chatsPerMatch(chats).values()].every((n) => n <= 1)).toBe(true);
      expect(duplicatePartnerPairs(matches)).toEqual([]);
      expect(futureSnapshots(snapshots, now)).toEqual([]);
      expect(outOfRangeScores(prefs)).toEqual([]);
      expect(nonPositiveCounts(events)).toEqual([]);
      expect(signedIncorrectly(exposure)).toEqual([]);
      expect(nonCanonical(matches)).toEqual([]);
      expect(chatsPointingToDeletedMatches(chats, matches)).toEqual([]);
      expect(malformedDeferredItems(deferred)).toEqual([]);
    });
  });
});
