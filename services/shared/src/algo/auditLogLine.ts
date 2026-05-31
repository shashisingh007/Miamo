/**
 * auditLogLine \u2014 Phase 20 OWASP A09 (security logging & monitoring).
 *
 * Builds a structured, single-line JSON audit record with a fixed schema
 * so SIEM rules don't drift. PII fields run through a tight allow-list of
 * scalar types; everything else is dropped. Output is always JSON-safe
 * and \\n-free so it's grep-friendly.
 *
 *   {ts, action, outcome, actor, target?, requestId?, ctx?}
 *
 * `actor.uid` must already be hashed by the caller (we don't accept raw
 * emails / phone numbers here).
 */
export type AuditOutcome = 'success' | 'failure' | 'denied';

export type AuditLogInputs = {
  nowMs: number;
  action: string;                 // e.g. "auth.login", "data.export"
  outcome: AuditOutcome;
  actorUidHash?: string | null;   // already hashed
  targetUidHash?: string | null;
  requestId?: string | null;
  ctx?: Record<string, unknown>;  // small scalar bag (strings/numbers/bools)
};

export type AuditLogLine = {
  ts: string;
  action: string;
  outcome: AuditOutcome;
  actor?: { uidHash: string };
  target?: { uidHash: string };
  requestId?: string;
  ctx?: Record<string, string | number | boolean>;
};

const ACTION_RE = /^[a-z0-9_]+(\.[a-z0-9_]+){1,3}$/;

function sanitiseCtx(ctx: Record<string, unknown> | undefined): Record<string, string | number | boolean> | undefined {
  if (!ctx) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(ctx)) {
    if (!/^[a-zA-Z0-9_]{1,40}$/.test(k)) continue;
    if (typeof v === 'string' && v.length <= 256) out[k] = v.replace(/[\r\n]+/g, ' ');
    else if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'boolean') out[k] = v;
    // everything else dropped
  }
  return Object.keys(out).length ? out : undefined;
}

export function buildAuditLine(inp: AuditLogInputs): AuditLogLine {
  if (!ACTION_RE.test(inp.action)) {
    throw new Error('auditLogLine: invalid action');
  }
  if (!['success', 'failure', 'denied'].includes(inp.outcome)) {
    throw new Error('auditLogLine: invalid outcome');
  }
  const line: AuditLogLine = {
    ts: new Date(Math.max(0, inp.nowMs)).toISOString(),
    action: inp.action,
    outcome: inp.outcome,
  };
  if (inp.actorUidHash) line.actor = { uidHash: inp.actorUidHash };
  if (inp.targetUidHash) line.target = { uidHash: inp.targetUidHash };
  if (inp.requestId) line.requestId = inp.requestId;
  const ctx = sanitiseCtx(inp.ctx);
  if (ctx) line.ctx = ctx;
  return line;
}

export function serialiseAuditLine(line: AuditLogLine): string {
  return JSON.stringify(line).replace(/[\r\n]+/g, ' ');
}
