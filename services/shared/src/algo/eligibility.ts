/**
 * Phase 15 — S1 eligibility filter details.
 *
 * Pure rule-based gating that runs before any scoring. Encodes the
 * non-negotiable constraints from the product spec:
 *
 *   - Block list: user A has explicitly blocked B (or vice-versa).
 *   - Age window: candidate outside the asker's stated age preferences.
 *   - Distance: candidate further than asker's max km (when both share loc).
 *   - Recent shown: candidate shown in the last N hours (anti-repeat).
 *   - Self: never show the user themselves.
 *
 * Returns each rejection with a reason code so the audit log can attribute
 * candidate-pool shrinkage to a specific rule.
 */

export type EligibilityCandidate = {
  id: string;
  age?: number | null;
  cityKm?: number | null;
  lastShownAt?: number | null; // epoch ms
};

export type EligibilityContext = {
  meId: string;
  ageMin?: number | null;
  ageMax?: number | null;
  maxKm?: number | null;
  blockSet?: Set<string>;
  recentShownWindowMs?: number;
  now?: number;
};

export type EligibilityReason =
  | 'self' | 'blocked' | 'age_window' | 'distance' | 'recently_shown';

export type EligibilityResult = {
  pass: EligibilityCandidate[];
  reject: Array<{ id: string; reason: EligibilityReason }>;
};

export function filterEligibility(
  cands: EligibilityCandidate[],
  ctx: EligibilityContext,
): EligibilityResult {
  const recentWindow = ctx.recentShownWindowMs ?? 6 * 60 * 60 * 1000;
  const now = ctx.now ?? Date.now();
  const blocks = ctx.blockSet ?? new Set<string>();

  const pass: EligibilityCandidate[] = [];
  const reject: Array<{ id: string; reason: EligibilityReason }> = [];

  for (const c of cands) {
    if (c.id === ctx.meId)                            { reject.push({ id: c.id, reason: 'self' }); continue; }
    if (blocks.has(c.id))                              { reject.push({ id: c.id, reason: 'blocked' }); continue; }
    if (!ageInWindow(c.age, ctx.ageMin, ctx.ageMax))   { reject.push({ id: c.id, reason: 'age_window' }); continue; }
    if (!distanceOk(c.cityKm, ctx.maxKm))              { reject.push({ id: c.id, reason: 'distance' }); continue; }
    if (c.lastShownAt != null && now - c.lastShownAt < recentWindow) {
      reject.push({ id: c.id, reason: 'recently_shown' }); continue;
    }
    pass.push(c);
  }
  return { pass, reject };
}

function ageInWindow(age: number | null | undefined, lo: number | null | undefined, hi: number | null | undefined): boolean {
  if (age == null) return true; // unknown age passes; downstream scorers handle
  if (lo != null && age < lo) return false;
  if (hi != null && age > hi) return false;
  return true;
}

function distanceOk(km: number | null | undefined, max: number | null | undefined): boolean {
  if (max == null) return true;
  if (km == null) return true; // unknown location: pass
  return km <= max;
}
