/**
 * HMAC-SHA256(base64url, 22) — same as services/shared/src/track/hash.ts.
 * Re-exported here so the algo layer never imports through track/ (keeps
 * package boundaries clean for future split).
 */
export { hashUid } from '../track/hash';
