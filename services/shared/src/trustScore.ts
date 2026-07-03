/**
 * Phase F — Trust Score (surface for the verified badge UI).
 *
 * Pure function that maps a user's verification/completion signals to a
 * 0..100 trust score plus a per-signal breakdown. No PII leaves this
 * function; consumers pass only the boolean/count signals they already
 * have on the user record.
 *
 * Score composition (weights sum to 100):
 *   selfieVerified     × 30
 *   emailVerified      × 15
 *   phoneVerified      × 15
 *   photoCountBonus    × 20   (min(photoCount, 4) / 4 * 20)
 *   completionScore    × 20   (0..1 completion score scaled to 0..20)
 *
 * The badge tier is a monotonic label on the same score:
 *   0..29   → 'unverified'
 *   30..59  → 'starter'
 *   60..79  → 'trusted'
 *   80..100 → 'verified'
 *
 * The `verified` badge shown in the UI is a strict subset of the top tier:
 * the user must have `selfieVerified === true` AND at least one contact
 * channel verified (email or phone) AND completion >= 0.6. This mirrors
 * the current profile-page badge but exposes the full breakdown so the
 * UI can show "you're one step away from verified" nudges.
 */

export interface TrustScoreSignals {
  selfieVerified: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  photoCount: number;
  completionScore: number; // 0..1
}

export interface TrustScoreBreakdown {
  score: number; // 0..100
  tier: 'unverified' | 'starter' | 'trusted' | 'verified';
  badgeEligible: boolean;
  signals: Array<{
    key: 'selfie' | 'email' | 'phone' | 'photos' | 'completion';
    label: string;
    contribution: number; // 0..weight
    weight: number;
    complete: boolean;
    nextStep?: string;
  }>;
}

export function computeTrustScore(s: TrustScoreSignals): TrustScoreBreakdown {
  const photoRatio = Math.min(1, Math.max(0, s.photoCount) / 4);
  const completion = Math.min(1, Math.max(0, s.completionScore));
  const selfieC = s.selfieVerified ? 30 : 0;
  const emailC = s.emailVerified ? 15 : 0;
  const phoneC = s.phoneVerified ? 15 : 0;
  const photoC = Math.round(photoRatio * 20);
  const complC = Math.round(completion * 20);
  const score = Math.min(100, selfieC + emailC + phoneC + photoC + complC);

  const tier: TrustScoreBreakdown['tier'] =
    score >= 80 ? 'verified' :
    score >= 60 ? 'trusted' :
    score >= 30 ? 'starter' : 'unverified';

  const badgeEligible =
    s.selfieVerified && (s.emailVerified || s.phoneVerified) && completion >= 0.6;

  return {
    score,
    tier,
    badgeEligible,
    signals: [
      { key: 'selfie', label: 'Selfie verification', contribution: selfieC, weight: 30, complete: s.selfieVerified,
        nextStep: s.selfieVerified ? undefined : 'Upload a selfie in Verification' },
      { key: 'email', label: 'Email verified', contribution: emailC, weight: 15, complete: s.emailVerified,
        nextStep: s.emailVerified ? undefined : 'Verify your email address' },
      { key: 'phone', label: 'Phone verified', contribution: phoneC, weight: 15, complete: s.phoneVerified,
        nextStep: s.phoneVerified ? undefined : 'Verify your phone number' },
      { key: 'photos', label: 'Profile photos', contribution: photoC, weight: 20, complete: s.photoCount >= 4,
        nextStep: s.photoCount >= 4 ? undefined : `Add ${4 - s.photoCount} more photo${4 - s.photoCount === 1 ? '' : 's'}` },
      { key: 'completion', label: 'Profile completion', contribution: complC, weight: 20, complete: completion >= 0.8,
        nextStep: completion >= 0.8 ? undefined : 'Complete more of your profile' },
    ],
  };
}
