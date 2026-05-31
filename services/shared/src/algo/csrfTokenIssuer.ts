import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Stateless CSRF token issuer (signed double-submit-cookie pattern).
 *
 *   token = `${nonce}.${expMs}.${sessionId-bound-HMAC}`
 *
 * - nonce is random per token
 * - HMAC binds the token to a sessionId (cookie value) so an attacker
 *   without the session cannot mint a valid token for someone else
 * - tokens carry their own expiry, no server-side store needed
 */

const SEP = '.';

export interface CsrfIssueResult {
  token: string;
  expiresAtMs: number;
}

export type CsrfVerifyResult =
  | { ok: true; expiresAtMs: number }
  | {
      ok: false;
      reason:
        | 'missing'
        | 'malformed'
        | 'expired'
        | 'session_mismatch'
        | 'signature_mismatch';
    };

export interface CsrfIssueOptions {
  /** lifetime in ms; default 1 hour */
  ttlMs?: number;
  /** explicit now override for tests */
  nowMs?: number;
  /** random nonce override for tests */
  nonce?: string;
}

function b64url(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function computeMac(secret: string, sessionId: string, nonce: string, expMs: number): string {
  return b64url(
    createHmac('sha256', secret)
      .update(`${sessionId}.${nonce}.${expMs}`)
      .digest()
  );
}

export function issueCsrfToken(
  secret: string,
  sessionId: string,
  opts: CsrfIssueOptions = {}
): CsrfIssueResult {
  if (!secret) throw new RangeError('secret required');
  if (!sessionId) throw new RangeError('sessionId required');
  const ttl = opts.ttlMs ?? 60 * 60_000;
  if (!Number.isFinite(ttl) || ttl <= 0) throw new RangeError('ttlMs must be > 0');
  const now = opts.nowMs ?? Date.now();
  const expMs = now + ttl;
  const nonce = opts.nonce ?? b64url(randomBytes(16));
  const mac = computeMac(secret, sessionId, nonce, expMs);
  return { token: `${nonce}${SEP}${expMs}${SEP}${mac}`, expiresAtMs: expMs };
}

export function verifyCsrfToken(
  secret: string,
  sessionId: string,
  token: string | null | undefined,
  nowMs?: number
): CsrfVerifyResult {
  if (!token || typeof token !== 'string') return { ok: false, reason: 'missing' };
  if (!secret || !sessionId) return { ok: false, reason: 'missing' };
  const parts = token.split(SEP);
  if (parts.length !== 3) return { ok: false, reason: 'malformed' };
  const [nonce, expRaw, mac] = parts;
  if (!nonce || !mac) return { ok: false, reason: 'malformed' };
  const expMs = Number(expRaw);
  if (!Number.isFinite(expMs) || expMs <= 0) return { ok: false, reason: 'malformed' };
  const now = nowMs ?? Date.now();
  if (now >= expMs) return { ok: false, reason: 'expired' };
  const expected = computeMac(secret, sessionId, nonce, expMs);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return { ok: false, reason: 'signature_mismatch' };
  if (!timingSafeEqual(a, b)) {
    // If swapping in the *correct* session would have matched, surface a clearer reason.
    return { ok: false, reason: 'signature_mismatch' };
  }
  return { ok: true, expiresAtMs: expMs };
}

/**
 * Convenience helper for the "session-rotation" case: verify a token issued
 * under a *previous* sessionId after a session-fixation reset. Returns true
 * iff the token would have been valid for the previous session.
 */
export function verifyCsrfTokenForSession(
  secret: string,
  candidateSessionIds: ReadonlyArray<string>,
  token: string | null | undefined,
  nowMs?: number
): CsrfVerifyResult {
  let last: CsrfVerifyResult = { ok: false, reason: 'session_mismatch' };
  for (const sid of candidateSessionIds) {
    const r = verifyCsrfToken(secret, sid, token, nowMs);
    if (r.ok) return r;
    last = r;
  }
  return last.ok ? last : { ok: false, reason: 'session_mismatch' };
}
