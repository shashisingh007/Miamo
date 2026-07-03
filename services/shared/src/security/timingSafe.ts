/**
 * Constant-time string comparison helper.
 *
 * bug-hunt part2 fix #2 (docs/architecture/bug-hunt-2026-07-part2.md #2, P1).
 *
 * Every place we compare a caller-supplied token/key against a server-side
 * secret (internal-service key, HMAC signature, CSRF token, etc.) must use
 * a constant-time compare so an attacker with a timing side-channel can't
 * probe the secret byte-by-byte. Node's V8 short-circuits `===`/`!==` on
 * strings at the first differing char, which is exactly the pattern
 * `crypto.timingSafeEqual` is designed to defeat.
 *
 * `crypto.timingSafeEqual` requires equal-length buffers; if lengths differ
 * we return false without invoking it (still constant-time in the sense
 * that the compare cost does not depend on which byte differs — only on
 * the length, which is public per the CSRF module already).
 */
import { timingSafeEqual } from 'node:crypto';

/**
 * Compare two strings in constant time. Returns false for:
 *   - null / undefined either side
 *   - non-string inputs
 *   - length mismatch
 *
 * Case-sensitive.
 */
export function timingSafeStringEqual(a: unknown, b: unknown): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  // Buffer.byteLength is what matters for timingSafeEqual — different
  // string lengths would throw. Reject early rather than throw.
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
