/**
 * Shared HMAC-SHA256(base64url, 22 chars) hash for user IDs in the tracking
 * pipeline. Identical implementation in ingest + worker + any read-side that
 * needs to look up PairCompatCache / FeatureSnapshot by userId.
 *
 * Rotating TRACKING_HASH_SECRET breaks join-ability with historical rows by
 * design — that is the kill switch for long-term re-identification risk.
 */
import { createHmac } from 'node:crypto';

const SECRET = process.env.TRACKING_HASH_SECRET || 'dev-only-tracking-hash-secret-change-me';

export function hashUid(id: string): string {
  if (!id) return '';
  return createHmac('sha256', SECRET).update(id).digest('base64url').slice(0, 22);
}
