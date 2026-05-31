import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Stripe-style webhook signature verifier:
 *   Header format: `t=<unixSecs>,v1=<hexSig>[,v1=<hexSig>...]`
 *   signedPayload = `${t}.${rawBody}`
 *   sig           = HMAC_SHA256(secret, signedPayload) (hex)
 * Verification fails if no v1 entry matches, or if |now-t| > tolerance.
 */

export type WebhookVerifyResult =
  | { ok: true; timestampMs: number }
  | {
      ok: false;
      reason:
        | 'missing_header'
        | 'missing_secret'
        | 'malformed_header'
        | 'no_v1_signature'
        | 'timestamp_skew'
        | 'signature_mismatch';
    };

export interface WebhookVerifyOptions {
  /** maximum |now - timestamp| in ms (default 5 minutes) */
  toleranceMs?: number;
  /** explicit "now" override (default Date.now()) */
  nowMs?: number;
}

export function parseWebhookSignatureHeader(header: string): {
  timestampSecs: number | null;
  v1: string[];
} {
  const out: { timestampSecs: number | null; v1: string[] } = {
    timestampSecs: null,
    v1: [],
  };
  if (typeof header !== 'string') return out;
  for (const part of header.split(',')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k === 't') {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0) out.timestampSecs = n;
    } else if (k === 'v1') {
      if (/^[0-9a-f]+$/i.test(v)) out.v1.push(v.toLowerCase());
    }
  }
  return out;
}

export function signWebhookPayload(
  secret: string,
  timestampSecs: number,
  rawBody: string
): string {
  return createHmac('sha256', secret)
    .update(`${timestampSecs}.${rawBody}`)
    .digest('hex');
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  if (ba.length !== bb.length || ba.length === 0) return false;
  return timingSafeEqual(ba, bb);
}

export function verifyWebhookSignature(
  rawBody: string,
  header: string | null | undefined,
  secret: string,
  opts: WebhookVerifyOptions = {}
): WebhookVerifyResult {
  if (header == null || header === '') return { ok: false, reason: 'missing_header' };
  if (!secret) return { ok: false, reason: 'missing_secret' };
  const tolerance = opts.toleranceMs ?? 5 * 60_000;
  const now = opts.nowMs ?? Date.now();

  const parsed = parseWebhookSignatureHeader(header);
  if (parsed.timestampSecs == null) {
    return { ok: false, reason: 'malformed_header' };
  }
  if (parsed.v1.length === 0) return { ok: false, reason: 'no_v1_signature' };

  const tsMs = parsed.timestampSecs * 1000;
  if (Math.abs(now - tsMs) > tolerance) {
    return { ok: false, reason: 'timestamp_skew' };
  }

  const expected = signWebhookPayload(secret, parsed.timestampSecs, rawBody);
  for (const sig of parsed.v1) {
    if (safeEqualHex(sig, expected)) {
      return { ok: true, timestampMs: tsMs };
    }
  }
  return { ok: false, reason: 'signature_mismatch' };
}
