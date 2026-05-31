/**
 * sessionTokenLifecycle \u2014 Phase 20 session-token lifecycle helper (pure).
 *
 * Pure state machine answering: "given this session record, what should
 * the server do on the next request?" Outcomes feed directly into the
 * auth middleware.
 *
 *   states:
 *     active     fresh token \u2014 serve normally
 *     refresh    within slide window OR within sliding-grace \u2014 re-issue
 *     expired    past absolute or sliding hard cap \u2014 reject
 *     revoked    revokedAt set                          \u2014 reject
 *     untrusted  ipChanged && requireIpStability        \u2014 force re-auth
 */

export type SessionLifecycleInput = {
  issuedAtMs: number;
  lastUsedAtMs: number;
  nowMs?: number;                         // default Date.now()
  revokedAtMs?: number | null;
  ipChanged?: boolean;
  absoluteLifetimeMs?: number;            // default 30d
  idleTimeoutMs?: number;                 // default 12h
  refreshWindowMs?: number;               // default 1h
  requireIpStability?: boolean;           // default false
};

export type SessionLifecycleVerdict = {
  state: 'active' | 'refresh' | 'expired' | 'revoked' | 'untrusted';
  reason:
    | 'fresh'
    | 'near_expiry'
    | 'idle_too_long'
    | 'absolute_lifetime_reached'
    | 'revoked'
    | 'ip_changed';
  msUntilHardExpiry: number;
};

const DAY = 24 * 60 * 60 * 1000;

export function evaluateSessionLifecycle(i: SessionLifecycleInput): SessionLifecycleVerdict {
  const now = i.nowMs ?? Date.now();
  const issued = i.issuedAtMs;
  const lastUsed = i.lastUsedAtMs;
  const absMax = Math.max(0, i.absoluteLifetimeMs ?? 30 * DAY);
  const idleMax = Math.max(0, i.idleTimeoutMs ?? 12 * 60 * 60 * 1000);
  const refreshWin = Math.max(0, i.refreshWindowMs ?? 60 * 60 * 1000);

  if (i.revokedAtMs && i.revokedAtMs <= now) {
    return { state: 'revoked', reason: 'revoked', msUntilHardExpiry: 0 };
  }

  const ageAbs = now - issued;
  const ageIdle = now - lastUsed;

  if (ageAbs >= absMax) {
    return { state: 'expired', reason: 'absolute_lifetime_reached', msUntilHardExpiry: 0 };
  }
  if (ageIdle >= idleMax) {
    return { state: 'expired', reason: 'idle_too_long', msUntilHardExpiry: 0 };
  }

  if (i.requireIpStability && i.ipChanged) {
    return { state: 'untrusted', reason: 'ip_changed', msUntilHardExpiry: Math.max(0, absMax - ageAbs) };
  }

  const msUntilAbs = absMax - ageAbs;
  const msUntilIdle = idleMax - ageIdle;
  const msUntilHard = Math.max(0, Math.min(msUntilAbs, msUntilIdle));

  if (msUntilHard <= refreshWin) {
    return { state: 'refresh', reason: 'near_expiry', msUntilHardExpiry: msUntilHard };
  }
  return { state: 'active', reason: 'fresh', msUntilHardExpiry: msUntilHard };
}
