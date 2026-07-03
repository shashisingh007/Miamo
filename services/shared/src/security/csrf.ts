/**
 * Phase 20 — CSRF token helper (OWASP A01 — broken access control).
 *
 * Stateless double-submit cookie token: caller stores a long-lived secret
 * (e.g. `CSRF_SECRET=<32B>` env), this module mints + verifies tokens that
 * combine a per-session id and an expiry timestamp. Web layer puts the
 * token in a cookie + in a header; verifier checks both match.
 *
 * Crypto: HMAC-SHA-256. We use Node's `crypto` directly to avoid pulling
 * in a heavyweight JWT lib for what is fundamentally a 1-claim token.
 */
import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';

export type IssueOptions = {
  /** Lifetime in seconds (default 3600 = 1h). */
  ttlSec?: number;
  /** Caller-supplied "now" for deterministic tests; default Date.now/1000. */
  nowSec?: number;
};

const DEFAULT_TTL_SEC = 3600;

/** Mint a CSRF token bound to `sessionId`. Returns base64url string. */
export function issueCsrfToken(
  secret: string,
  sessionId: string,
  opts: IssueOptions = {},
): string {
  assertSecret(secret);
  if (!sessionId) throw new Error('sessionId required');

  const now = opts.nowSec ?? Math.floor(Date.now() / 1000);
  const exp = now + (opts.ttlSec ?? DEFAULT_TTL_SEC);
  const nonce = randomBytes(8).toString('base64url');
  const payload = `${sessionId}.${exp}.${nonce}`;
  const sig = hmac(secret, payload);
  return `${b64u(payload)}.${sig}`;
}

export type VerifyResult =
  | { ok: true; sessionId: string; expSec: number }
  | { ok: false; reason: 'malformed' | 'bad_signature' | 'expired' | 'session_mismatch' };

/** Verify a CSRF token; rejects if expired, tampered, or bound to a
 *  different session id. */
export function verifyCsrfToken(
  secret: string,
  expectedSessionId: string,
  token: string,
  opts: IssueOptions = {},
): VerifyResult {
  assertSecret(secret);
  if (!token || typeof token !== 'string') return { ok: false, reason: 'malformed' };

  const parts = token.split('.');
  if (parts.length !== 2) return { ok: false, reason: 'malformed' };
  const [payloadB64, sig] = parts;

  let payload: string;
  try { payload = Buffer.from(payloadB64, 'base64url').toString('utf8'); }
  catch { return { ok: false, reason: 'malformed' }; }

  const expected = hmac(secret, payload);
  if (!safeEq(sig, expected)) return { ok: false, reason: 'bad_signature' };

  const segments = payload.split('.');
  if (segments.length !== 3) return { ok: false, reason: 'malformed' };
  const [sid, expStr] = segments;
  const expSec = Number(expStr);
  if (!Number.isFinite(expSec)) return { ok: false, reason: 'malformed' };

  const now = opts.nowSec ?? Math.floor(Date.now() / 1000);
  if (now >= expSec) return { ok: false, reason: 'expired' };
  if (sid !== expectedSessionId) return { ok: false, reason: 'session_mismatch' };

  return { ok: true, sessionId: sid, expSec };
}

function assertSecret(s: string): void {
  if (!s || s.length < 16) throw new Error('csrf secret must be >=16 chars');
}

function hmac(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function b64u(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64url');
}

function safeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
