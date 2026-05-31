/**
 * webhookSig \u2014 Phase 20 OWASP A02 HMAC-SHA256 webhook signature verifier.
 *
 * Inbound webhook signatures are checked the same way every major provider
 * (Stripe, GitHub, Slack) does:
 *
 *   sig = HMAC_SHA256(secret, `${timestamp}.${rawBody}`)
 *
 * We verify the timestamp is within `maxClockSkewSec` (default 300s) to
 * block replay, then constant-time-compare the digest. We use Node's
 * `crypto.timingSafeEqual` to defeat timing oracles.
 *
 * Pure-ish: depends on Node's `crypto` which is deterministic for fixed
 * inputs; no IO, no network.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export type WebhookSigOptions = {
  /** Max allowed skew between header timestamp and `nowMs` in seconds. */
  maxClockSkewSec?: number;
};

export type WebhookSigResult =
  | { ok: true }
  | { ok: false; reason: 'missing' | 'malformed' | 'expired' | 'bad_signature' };

const DEFAULT_SKEW = 300;

export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string,
  nowMs: number,
  opts: WebhookSigOptions = {},
): WebhookSigResult {
  if (!signatureHeader) return { ok: false, reason: 'missing' };
  // Header format: "t=1700000000,v1=abcdef..."
  const parts = Object.create(null) as Record<string, string>;
  for (const seg of signatureHeader.split(',')) {
    const i = seg.indexOf('=');
    if (i <= 0) continue;
    parts[seg.slice(0, i).trim()] = seg.slice(i + 1).trim();
  }
  const ts = parts['t'];
  const sig = parts['v1'];
  if (!ts || !sig || !/^\d+$/.test(ts) || !/^[0-9a-f]{64}$/i.test(sig)) {
    return { ok: false, reason: 'malformed' };
  }
  const tsMs = Number(ts) * 1000;
  const skew = Math.abs(nowMs - tsMs);
  const max = (opts.maxClockSkewSec ?? DEFAULT_SKEW) * 1000;
  if (skew > max) return { ok: false, reason: 'expired' };

  const expected = createHmac('sha256', secret).update(`${ts}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(sig.toLowerCase(), 'hex');
  if (a.length !== b.length) return { ok: false, reason: 'bad_signature' };
  if (!timingSafeEqual(a, b)) return { ok: false, reason: 'bad_signature' };
  return { ok: true };
}

/** Helper for tests / our own outbound webhooks. */
export function buildWebhookSignature(rawBody: string, secret: string, atSec: number): string {
  const sig = createHmac('sha256', secret).update(`${atSec}.${rawBody}`).digest('hex');
  return `t=${atSec},v1=${sig}`;
}
