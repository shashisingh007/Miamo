/**
 * passwordRotationPolicy \u2014 Phase 20 password-rotation decision helper (pure).
 *
 * Given password metadata (age, breach flag, weak-strength flag, forced-by
 * admin flag), returns a rotation verdict + reason and the optional grace
 * period before lockout.
 *
 *   states: 'ok' | 'should_rotate' | 'must_rotate' | 'expired'
 *
 *     ok            no flags, age < maxAgeDays
 *     should_rotate weak OR age \u2265 warnAtDays  (no breach, no force)
 *     must_rotate   breach OR forced
 *     expired       age \u2265 maxAgeDays AND no grace window remains
 */

export type RotationInput = {
  passwordAgeDays: number;
  breached?: boolean;
  weak?: boolean;
  forcedByAdmin?: boolean;
  warnAtDays?: number;   // default 60
  maxAgeDays?: number;   // default 90
  graceDays?: number;    // default 14
};

export type RotationVerdict = 'ok' | 'should_rotate' | 'must_rotate' | 'expired';

export type RotationResult = {
  verdict: RotationVerdict;
  reason: 'fresh' | 'aging' | 'weak' | 'breached' | 'forced' | 'expired';
  graceDaysRemaining: number;
};

export function evaluateRotation(i: RotationInput): RotationResult {
  const age = Math.max(0, Number.isFinite(i.passwordAgeDays) ? i.passwordAgeDays : 0);
  const warn = Math.max(0, i.warnAtDays ?? 60);
  const max = Math.max(warn, i.maxAgeDays ?? 90);
  const grace = Math.max(0, i.graceDays ?? 14);
  const breached = !!i.breached;
  const weak = !!i.weak;
  const forced = !!i.forcedByAdmin;

  // Hard expiry past grace window first.
  if (age >= max + grace) {
    return { verdict: 'expired', reason: 'expired', graceDaysRemaining: 0 };
  }

  // Must rotate (still allowed in-app) for breach / admin force.
  if (breached) {
    return {
      verdict: 'must_rotate',
      reason: 'breached',
      graceDaysRemaining: Math.max(0, max + grace - age),
    };
  }
  if (forced) {
    return {
      verdict: 'must_rotate',
      reason: 'forced',
      graceDaysRemaining: Math.max(0, max + grace - age),
    };
  }

  if (age >= max) {
    return {
      verdict: 'must_rotate',
      reason: 'expired',
      graceDaysRemaining: Math.max(0, max + grace - age),
    };
  }

  if (weak) {
    return {
      verdict: 'should_rotate',
      reason: 'weak',
      graceDaysRemaining: Math.max(0, max + grace - age),
    };
  }
  if (age >= warn) {
    return {
      verdict: 'should_rotate',
      reason: 'aging',
      graceDaysRemaining: Math.max(0, max + grace - age),
    };
  }

  return { verdict: 'ok', reason: 'fresh', graceDaysRemaining: Math.max(0, max + grace - age) };
}
