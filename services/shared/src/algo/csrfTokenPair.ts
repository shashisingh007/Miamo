/**
 * csrfTokenPair \u2014 Phase 20 synchronizer-token CSRF validator (pure).
 *
 * Implements the double-submit-cookie / synchronizer token pattern check
 * in a pure form. The actual token issuance is left to the auth layer;
 * this module just safely compares the cookie token to the header / form
 * token using constant-time-ish comparison and validates basic shape.
 *
 *   verifyCsrfTokenPair({ cookieToken, headerToken, minLength?, maxLength? })
 *     -> { valid: true } | { valid: false, reason }
 *
 * Constant-time comparison via charCode-XOR avoids early-exit timing leaks.
 */

export type CsrfVerifyInput = {
  cookieToken: string | null | undefined;
  headerToken: string | null | undefined;
  minLength?: number;
  maxLength?: number;
};

export type CsrfVerifyResult =
  | { valid: true }
  | {
      valid: false;
      reason:
        | 'missing_cookie'
        | 'missing_header'
        | 'too_short'
        | 'too_long'
        | 'mismatch'
        | 'bad_charset';
    };

const TOKEN_CHARSET = /^[A-Za-z0-9_\-]+$/;

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function verifyCsrfTokenPair(i: CsrfVerifyInput): CsrfVerifyResult {
  const min = i.minLength ?? 16;
  const max = i.maxLength ?? 256;
  const c = i.cookieToken ?? '';
  const h = i.headerToken ?? '';

  if (!c) return { valid: false, reason: 'missing_cookie' };
  if (!h) return { valid: false, reason: 'missing_header' };
  if (c.length < min || h.length < min) return { valid: false, reason: 'too_short' };
  if (c.length > max || h.length > max) return { valid: false, reason: 'too_long' };
  if (!TOKEN_CHARSET.test(c) || !TOKEN_CHARSET.test(h)) {
    return { valid: false, reason: 'bad_charset' };
  }
  if (!constantTimeEqual(c, h)) return { valid: false, reason: 'mismatch' };
  return { valid: true };
}
