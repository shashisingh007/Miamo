/**
 * authBypassGuards \u2014 Phase 20 OWASP A07 (auth + identification failures).
 *
 * Pure pre-flight check called at the top of every authenticated handler.
 * Returns either a fully-resolved principal or a precise denial reason
 * the caller can map to 401/403 + telemetry.
 */
export type Principal = {
  uid: string;
  sessionId: string;
  scopes: string[];
  expiresAtMs: number;
};

export type AuthCheckInputs = {
  principal: Principal | null | undefined;
  nowMs: number;
  requiredScopes?: string[];
  /** Optional: enforce the request targets the principal\u2019s own uid (e.g. PATCH /me) */
  targetUid?: string;
};

export type AuthCheckResult =
  | { ok: true; principal: Principal }
  | { ok: false; reason:
      | 'missing_principal'
      | 'invalid_uid'
      | 'invalid_session'
      | 'expired'
      | 'missing_scope'
      | 'uid_mismatch' };

const UID_RE = /^[a-zA-Z0-9_-]{1,128}$/;
const SID_RE = /^[a-zA-Z0-9_-]{8,256}$/;

export function checkAuth(inp: AuthCheckInputs): AuthCheckResult {
  const p = inp.principal;
  if (!p) return { ok: false, reason: 'missing_principal' };
  if (typeof p.uid !== 'string' || !UID_RE.test(p.uid)) return { ok: false, reason: 'invalid_uid' };
  if (typeof p.sessionId !== 'string' || !SID_RE.test(p.sessionId)) return { ok: false, reason: 'invalid_session' };
  if (!Number.isFinite(p.expiresAtMs) || p.expiresAtMs <= inp.nowMs) return { ok: false, reason: 'expired' };
  if (inp.requiredScopes && inp.requiredScopes.length > 0) {
    const have = new Set(p.scopes ?? []);
    for (const s of inp.requiredScopes) {
      if (!have.has(s)) return { ok: false, reason: 'missing_scope' };
    }
  }
  if (typeof inp.targetUid === 'string' && inp.targetUid !== p.uid) {
    return { ok: false, reason: 'uid_mismatch' };
  }
  return { ok: true, principal: p };
}

/** Convenience: returns true iff principal currently holds *all* of the scopes. */
export function hasScopes(principal: Principal | null | undefined, scopes: string[]): boolean {
  if (!principal) return false;
  const have = new Set(principal.scopes ?? []);
  for (const s of scopes) if (!have.has(s)) return false;
  return true;
}
