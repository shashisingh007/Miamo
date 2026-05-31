/**
 * webhookSignatureVerify \u2014 Phase 20 HMAC-SHA256 webhook signature
 * verifier with optional timestamp freshness window (pure-ish; uses
 * node:crypto for HMAC + timing-safe compare).
 *
 *   verifyWebhookSignature({ body, signatureHeader, secret, timestamp?,
 *     toleranceSeconds?, now? })
 *
 * Signature header formats accepted:
 *   - "sha256=<hex>"
 *   - "<hex>"
 *
 * If a `timestamp` (unix-seconds) is supplied, the signed payload is
 * `${timestamp}.${body}` (Stripe-style), and the timestamp must be within
 * `toleranceSeconds` of `now()`.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export type WebhookVerifyInput = {
  body: string;
  signatureHeader: string | null | undefined;
  secret: string;
  timestamp?: number | string | null;
  toleranceSeconds?: number;
  now?: () => number; // seconds
};

export type WebhookVerifyResult =
  | { valid: true }
  | {
      valid: false;
      reason:
        | 'missing_signature'
        | 'missing_secret'
        | 'bad_header_format'
        | 'mismatch'
        | 'stale_timestamp'
        | 'bad_timestamp';
    };

function stripPrefix(h: string): string {
  const idx = h.indexOf('=');
  if (idx === -1) return h.trim();
  return h.slice(idx + 1).trim();
}

const HEX = /^[a-f0-9]+$/i;

export function verifyWebhookSignature(i: WebhookVerifyInput): WebhookVerifyResult {
  if (!i.secret) return { valid: false, reason: 'missing_secret' };
  const header = (i.signatureHeader ?? '').trim();
  if (!header) return { valid: false, reason: 'missing_signature' };

  const provided = stripPrefix(header).toLowerCase();
  if (!HEX.test(provided)) return { valid: false, reason: 'bad_header_format' };

  let ts: number | null = null;
  if (i.timestamp !== undefined && i.timestamp !== null) {
    const n = typeof i.timestamp === 'string' ? Number(i.timestamp) : i.timestamp;
    if (!Number.isFinite(n)) return { valid: false, reason: 'bad_timestamp' };
    ts = n;
    const now = (i.now ?? (() => Math.floor(Date.now() / 1000)))();
    const tol = i.toleranceSeconds ?? 300;
    if (Math.abs(now - ts) > tol) return { valid: false, reason: 'stale_timestamp' };
  }

  const payload = ts !== null ? `${ts}.${i.body}` : i.body;
  const expected = createHmac('sha256', i.secret).update(payload).digest('hex');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(provided, 'utf8');
  if (a.length !== b.length) return { valid: false, reason: 'mismatch' };
  const ok = timingSafeEqual(a, b);
  return ok ? { valid: true } : { valid: false, reason: 'mismatch' };
}
