/**
 * oauthStateNonce \u2014 Phase 20 OAuth `state` + `nonce` lifecycle helper.
 *
 * Tracks short-lived state/nonce records issued during the auth-code redirect
 * round-trip. Verifies single-use, time-bound, and bound-to-client-id. Uses
 * `node:crypto` for opaque value generation and timing-safe compare.
 */
import { randomBytes, timingSafeEqual } from 'node:crypto';

export type OAuthStateRecord = {
  state: string;
  nonce: string;
  clientId: string;
  createdAtMs: number;
  consumedAtMs?: number;
};

export type IssueResult = { state: string; nonce: string };

export type VerifyInput = {
  state: string;
  nonce?: string;             // optional: also bind nonce
  clientId: string;
  nowMs?: number;
  ttlMs?: number;             // default 10min
};

export type VerifyResult =
  | { ok: true; record: OAuthStateRecord }
  | {
      ok: false;
      reason:
        | 'unknown_state'
        | 'expired'
        | 'already_consumed'
        | 'client_mismatch'
        | 'nonce_mismatch';
    };

export function createOAuthStateStore() {
  const map = new Map<string, OAuthStateRecord>();

  function issue(clientId: string, nowMs: number = Date.now()): IssueResult {
    const state = randomBytes(24).toString('base64url');
    const nonce = randomBytes(24).toString('base64url');
    map.set(state, { state, nonce, clientId, createdAtMs: nowMs });
    return { state, nonce };
  }

  function verify(i: VerifyInput): VerifyResult {
    const now = i.nowMs ?? Date.now();
    const ttl = i.ttlMs ?? 10 * 60 * 1000;
    const rec = map.get(i.state);
    if (!rec) return { ok: false, reason: 'unknown_state' };
    if (rec.consumedAtMs) return { ok: false, reason: 'already_consumed' };
    if (now - rec.createdAtMs > ttl) return { ok: false, reason: 'expired' };
    if (i.clientId !== rec.clientId) return { ok: false, reason: 'client_mismatch' };
    if (i.nonce !== undefined) {
      const a = Buffer.from(rec.nonce, 'utf8');
      const b = Buffer.from(i.nonce, 'utf8');
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        return { ok: false, reason: 'nonce_mismatch' };
      }
    }
    rec.consumedAtMs = now;
    return { ok: true, record: rec };
  }

  function purgeExpired(nowMs: number = Date.now(), ttlMs = 10 * 60 * 1000): number {
    let removed = 0;
    for (const [k, r] of map) {
      if (r.consumedAtMs || nowMs - r.createdAtMs > ttlMs) {
        map.delete(k);
        removed++;
      }
    }
    return removed;
  }

  function size(): number {
    return map.size;
  }

  return { issue, verify, purgeExpired, size };
}
