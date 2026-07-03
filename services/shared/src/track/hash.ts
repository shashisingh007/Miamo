/**
 * Shared HMAC-SHA256(base64url, 22 chars) hash for user IDs in the tracking
 * pipeline. Identical implementation in ingest + worker + any read-side that
 * needs to look up PairCompatCache / FeatureSnapshot by userId.
 *
 * Rotating TRACKING_HASH_SECRET breaks join-ability with historical rows by
 * design — that is the kill switch for long-term re-identification risk.
 */
import { createHmac } from 'node:crypto';

// bug-hunt fix #8 (docs/architecture/bug-hunt-2026-07.md #15) — read the secret
// per-call so that late-hydrated env values (e.g. `secrets.ts` fetching from
// AWS Secrets Manager AFTER this module has already been imported) are picked
// up. We memoise the string+HMAC-instance pair so hot-path callers pay only
// one property read per event-loop tick.
let _cachedSecret: string | null = null;

function resolveSecret(): string {
  const cur = process.env.TRACKING_HASH_SECRET || 'dev-only-tracking-hash-secret-change-me';
  if (cur !== _cachedSecret) _cachedSecret = cur;
  return cur;
}

export function hashUid(id: string): string {
  if (!id) return '';
  return createHmac('sha256', resolveSecret()).update(id).digest('base64url').slice(0, 22);
}

/** Test-only: force a re-read of the secret on the next call. */
export function _resetHashSecretCache(): void { _cachedSecret = null; }
