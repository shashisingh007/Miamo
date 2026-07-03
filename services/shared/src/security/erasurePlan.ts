/**
 * Phase 20 — GDPR data-erasure plan builder (DELETE /v1/me/data).
 *
 * Pure planner: given a user id and a catalogue of (table, owner-column,
 * action) entries, produces an ordered, idempotent erasure plan. The
 * actual SQL execution lives in a thin wrapper in the auth/users service
 * \u2014 keeping the planner pure means we can test the policy without a DB.
 *
 * Three actions per table:
 *   - `delete`   row physically removed
 *   - `anonymise` row stays but PII columns nulled / hashed
 *   - `retain`   row stays (legal-hold: audit log, financial records)
 *
 * Ordering rules:
 *   1. Child tables (FK pointers) erased before parent.
 *   2. `retain` actions are last so the audit trail captures the deletion.
 *   3. Stable secondary sort by table name for reproducibility.
 */

export type ErasureAction = 'delete' | 'anonymise' | 'retain';

export type ErasureEntry = {
  table: string;
  ownerColumn: string;          // e.g. 'userId' or 'uidHash'
  action: ErasureAction;
  /** lower numbers run first (FK leaves are higher) */
  depth: number;
  /** columns to null / hash when action='anonymise' */
  piiColumns?: string[];
  /** legal-hold reason when action='retain' */
  retainReason?: string;
};

export type ErasureStep = {
  table: string;
  ownerColumn: string;
  action: ErasureAction;
  piiColumns?: string[];
  retainReason?: string;
};

export type ErasurePlan = {
  userId: string;
  steps: ErasureStep[];
  summary: { delete: number; anonymise: number; retain: number };
};

export function buildErasurePlan(userId: string, catalogue: ErasureEntry[]): ErasurePlan {
  if (!userId) throw new Error('userId required');

  const actionRank: Record<ErasureAction, number> = { delete: 0, anonymise: 1, retain: 2 };
  const sorted = [...catalogue].sort((a, b) => {
    const ar = actionRank[a.action] - actionRank[b.action];
    if (ar !== 0) return ar;
    if (a.depth !== b.depth) return b.depth - a.depth; // deeper (leaves) first
    return a.table.localeCompare(b.table);
  });

  const steps: ErasureStep[] = sorted.map((e) => ({
    table: e.table,
    ownerColumn: e.ownerColumn,
    action: e.action,
    ...(e.piiColumns ? { piiColumns: [...e.piiColumns] } : {}),
    ...(e.retainReason ? { retainReason: e.retainReason } : {}),
  }));

  const summary = { delete: 0, anonymise: 0, retain: 0 };
  for (const s of steps) summary[s.action] += 1;

  return { userId, steps, summary };
}

/** Default catalogue for the Miamo schema. Services with their own tables
 *  extend this list at registration time. */
export const DEFAULT_ERASURE_CATALOGUE: ReadonlyArray<ErasureEntry> = [
  // Leaf / event tables \u2014 delete first
  { table: 'EventAggHourly',      ownerColumn: 'uidHash', action: 'delete',    depth: 5 },
  { table: 'EventAggDaily',       ownerColumn: 'uidHash', action: 'delete',    depth: 5 },
  { table: 'FeatureSnapshot',     ownerColumn: 'uidHash', action: 'delete',    depth: 5 },
  { table: 'SessionSummary',      ownerColumn: 'uidHash', action: 'delete',    depth: 5 },
  { table: 'FocusAffinityHourly', ownerColumn: 'uidHash', action: 'delete',    depth: 5 },
  { table: 'UserWeightProfile',   ownerColumn: 'userId',  action: 'delete',    depth: 4 },
  { table: 'UserMoveProfile',     ownerColumn: 'userId',  action: 'delete',    depth: 4 },
  { table: 'PairCompatCache',     ownerColumn: 'aUserId', action: 'delete',    depth: 4 },
  // Domain data
  { table: 'Match',               ownerColumn: 'userId',  action: 'delete',    depth: 3 },
  { table: 'Message',             ownerColumn: 'fromUserId', action: 'anonymise', depth: 3,
    piiColumns: ['body', 'attachmentUrl'] },
  { table: 'Album',               ownerColumn: 'userId',  action: 'delete',    depth: 3 },
  { table: 'Profile',             ownerColumn: 'userId',  action: 'anonymise', depth: 2,
    piiColumns: ['displayName', 'bio', 'avatarUrl', 'city', 'phone', 'email'] },
  { table: 'User',                ownerColumn: 'id',      action: 'anonymise', depth: 1,
    piiColumns: ['email', 'phone', 'displayName'] },
  // Legal-hold
  { table: 'AuditLog',            ownerColumn: 'actorUserId', action: 'retain', depth: 0,
    retainReason: '90d security retention' },
  { table: 'PaymentTransaction',  ownerColumn: 'userId',      action: 'retain', depth: 0,
    retainReason: '7y financial retention' },
];
