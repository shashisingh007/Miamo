/**
 * dtmAuditEvent \u2014 DTM Phase 18 audit-event builder.
 *
 * Every mutation to a user's DTM vector (answer ingest, drift recompute,
 * GDPR erase, cohort reassign) must emit one canonical audit event so we
 * can replay history during a dispute. This module is the *pure builder*;
 * the dtm-vector worker calls it then writes the row.
 *
 * Schema is intentionally narrow (no free-text payload) so it is safe to
 * archive for years. PII redaction is enforced at the type level.
 */
export type DtmAuditAction =
  | 'answer.ingested'
  | 'vector.recomputed'
  | 'drift.detected'
  | 'cohort.reassigned'
  | 'gdpr.erased'
  | 'consent.revoked';

export type DtmAuditEvent = {
  /** ULID-ish monotonic event id (caller supplies). */
  eventId: string;
  /** Hashed user id (never raw uid). */
  userHash: string;
  action: DtmAuditAction;
  /** Topic affected, if applicable. null for whole-vector ops. */
  topic: string | null;
  /** v6/v7 algo version that ran. */
  algoVersion: string;
  /** Wall-clock ms. */
  atMs: number;
  /** Optional 3-char outcome code (e.g. "ok", "noop", "err"). No free text. */
  outcomeCode: string;
};

export type BuildAuditInputs = {
  eventId: string;
  userHash: string;
  action: DtmAuditAction;
  topic?: string | null;
  algoVersion: string;
  atMs: number;
  outcomeCode?: string;
};

const OUTCOME_RE = /^[a-z0-9_]{1,8}$/;
const HASH_RE    = /^[a-f0-9]{8,64}$/;

export function buildDtmAuditEvent(inp: BuildAuditInputs): DtmAuditEvent {
  if (!inp.eventId || inp.eventId.length > 64) {
    throw new Error('dtmAuditEvent: eventId must be 1..64 chars');
  }
  if (!HASH_RE.test(inp.userHash)) {
    throw new Error('dtmAuditEvent: userHash must be hex 8..64 chars (use hashOf, never raw uid)');
  }
  if (!Number.isFinite(inp.atMs) || inp.atMs <= 0) {
    throw new Error('dtmAuditEvent: atMs must be a positive finite number');
  }
  const outcome = inp.outcomeCode ?? 'ok';
  if (!OUTCOME_RE.test(outcome)) {
    throw new Error('dtmAuditEvent: outcomeCode must match /^[a-z0-9_]{1,8}$/');
  }
  return {
    eventId: inp.eventId,
    userHash: inp.userHash,
    action: inp.action,
    topic: inp.topic ?? null,
    algoVersion: inp.algoVersion,
    atMs: inp.atMs,
    outcomeCode: outcome,
  };
}

/** Stable canonical-JSON encoding so identical events hash equally. */
export function canonicalize(ev: DtmAuditEvent): string {
  // Keys sorted alphabetically. No whitespace. Numbers kept as-is.
  const keys = Object.keys(ev).sort() as Array<keyof DtmAuditEvent>;
  const parts = keys.map((k) => `${JSON.stringify(k)}:${JSON.stringify(ev[k])}`);
  return `{${parts.join(',')}}`;
}
