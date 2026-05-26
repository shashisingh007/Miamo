import { createHmac } from 'node:crypto';

/**
 * HMAC-SHA256 a userId/deviceId into an opaque hash used as the join key in
 * all tracking tables. The secret comes from `TRACKING_HASH_SECRET` and MAY
 * be rotated by writing rows under both keys during the rotation window.
 *
 * Right-to-erasure: deleting the row in `User` and rotating this secret
 * forever breaks the join from new aggregates back to the user identity.
 */
const SECRET = process.env.TRACKING_HASH_SECRET || 'dev-only-tracking-hash-secret-change-me';

export function hashUid(id: string | null | undefined): string {
  if (!id) return '';
  return createHmac('sha256', SECRET).update(id).digest('base64url').slice(0, 22);
}
