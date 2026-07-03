/**
 * Phase F — user-visible feature flags (default OFF except for launch-blocking
 * DPDP/GDPR compliance features).
 *
 * Convention:
 *   - Every user-visible feature that is not legally required ships behind a
 *     default-OFF `FEATURE_*_ENABLED` env flag so ops can ramp it per-cluster
 *     without a redeploy.
 *   - DPDP/GDPR compliance features (account deletion, data export, block/
 *     report) are ALWAYS ON — flag helper returns true unconditionally so
 *     `services/*` can uniformly gate every user-visible feature through
 *     this file without breaking legal obligations.
 *   - The `PHASE_F_FLAG_SNAPSHOT` helper below powers the debug dashboard.
 *
 * Cross-refs:
 *   - FULL_AUDIT_AND_LEARNING_V2_PROMPT.md §Phase F
 *   - docs/architecture/click-matrix.md §3 (coming-soon audit)
 */

/** Legally-required, always-on. Endpoint returns 404 only if the caller is
 *  unauthenticated — never based on flag state. */
export function accountDeletionEnabled(): boolean {
  return true;
}

/** Legally-required, always-on. Same rationale as accountDeletionEnabled. */
export function dataExportEnabled(): boolean {
  return true;
}

/** Legally-required, always-on. Report + block are non-negotiable safety
 *  primitives on a dating app. */
export function reportFlowEnabled(): boolean {
  return true;
}

/** Default-OFF, user-visible. Surfaces the trust-score breakdown API. */
export function trustScoreEnabled(): boolean {
  return process.env.FEATURE_TRUST_SCORE_ENABLED === '1';
}

/** Default-OFF, user-visible. Weekly Top 10 refresh countdown UI. */
export function weeklyTopCountdownEnabled(): boolean {
  return process.env.FEATURE_WEEKLY_TOP_COUNTDOWN_ENABLED === '1';
}

/** Default-OFF, user-visible. Family Brief share-history dashboard. */
export function familyBriefSharesEnabled(): boolean {
  return process.env.FEATURE_FAMILY_BRIEF_SHARES_ENABLED === '1';
}

/** Snapshot every Phase F flag in one object. */
export function phaseFFlagSnapshot(): Record<string, boolean> {
  return {
    accountDeletion:      accountDeletionEnabled(),
    dataExport:           dataExportEnabled(),
    reportFlow:           reportFlowEnabled(),
    trustScore:           trustScoreEnabled(),
    weeklyTopCountdown:   weeklyTopCountdownEnabled(),
    familyBriefShares:    familyBriefSharesEnabled(),
  };
}
