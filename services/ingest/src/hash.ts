import { createHmac } from 'node:crypto';

/**
 * HMAC-SHA256 a userId/deviceId into an opaque 22-char base64url hash used
 * as the join key in all tracking tables.
 *
 * bug-hunt part2 fix #3 (docs/architecture/bug-hunt-2026-07-part2.md #3) —
 * the previous implementation captured `process.env.TRACKING_HASH_SECRET`
 * at module load. If `secrets.ts` hydrates the secret AFTER this module is
 * imported (the canonical prod boot flow), the HMAC quietly degrades to
 * the dev-default constant and every tracking event hashes to a collision-
 * prone bucket. Now we resolve per-call and memoise the last-seen value so
 * hot-path callers still pay only one property read per event-loop tick.
 */
let _cachedSecret: string | null = null;
function resolveTrackingSecret(): string {
  const cur = process.env.TRACKING_HASH_SECRET || 'dev-only-tracking-hash-secret-change-me';
  if (cur !== _cachedSecret) _cachedSecret = cur;
  return cur;
}

export function hashUid(id: string | null | undefined): string {
  if (!id) return '';
  return createHmac('sha256', resolveTrackingSecret()).update(id).digest('base64url').slice(0, 22);
}

/** Test-only: force a re-read of the secret on the next call. */
export function _resetHashSecretCache(): void { _cachedSecret = null; }
