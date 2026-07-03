// ─── Progressive-disclosure rules (G.18) ─────────────────────────────
//
// Purpose: gate advanced features from a fresh user's UI until the moment
// they're ready to encounter them. A user with 0 matches doesn't need the
// DTM tab in their sidebar; a user on `intent=exploring` shouldn't see
// the Family Brief. Every rule below is written in plain English + a
// pure boolean function so we can unit-test each independently.
//
// Feature flag: `FEATURE_PROGRESSIVE_DISCLOSURE_ENABLED` (client-side, read
// from window on mount). Off = every feature is always visible (current
// v1 behaviour). On = the rules below apply. Default: OFF at v1.

/**
 * Minimal user shape the disclosure helper needs. Callers pass whatever
 * they have — `null` fields mean "we don't know yet" (treat as newest
 * possible user; hide the most gated features).
 */
export interface DisclosureUser {
  matchCount: number | null;
  /** ISO-8601 signup date. */
  signupAt: string | Date | null;
  /** From Profile.datingIntent: 'serious' | 'casual' | 'dtm' | 'exploring' | null. */
  intent: 'serious' | 'casual' | 'dtm' | 'exploring' | null;
  /** Whether the user has completed onboarding (profileHealth ≥ 0.75). */
  onboardingComplete: boolean;
  /** Whether the user has explicitly enabled serious-mode in Settings. */
  seriousModeEnabled: boolean;
}

/** The features whose visibility we gate. Kept as a closed union so a
 *  future addition can't be misspelled at the call site. */
export type GatedFeature =
  | 'dtm'
  | 'family-brief'
  | 'anti-ghost'
  | 'weekly-top-10'
  | 'ai-match'
  | 'creativity-earn'
  | 'vibe-check';

/** Days since signup — helper. Returns `Infinity` when signupAt is missing. */
export function daysSinceSignup(user: Pick<DisclosureUser, 'signupAt'>, now: Date = new Date()): number {
  if (!user.signupAt) return Infinity;
  const t = typeof user.signupAt === 'string' ? new Date(user.signupAt).getTime() : user.signupAt.getTime();
  if (!Number.isFinite(t)) return Infinity;
  return Math.max(0, (now.getTime() - t) / (24 * 60 * 60 * 1000));
}

/**
 * shouldShowFeature — pure rule engine. Every rule is documented inline.
 *
 * The rules encode the panel decision from `FULL_AUDIT_AND_LEARNING_V2_PROMPT.md`
 * §G.18 (progressive disclosure):
 *
 *   - Don't show DTM to a user who hasn't matched anyone.
 *   - Don't show Family Brief before intent=serious.
 *   - Anti-ghost sits behind ≥ 3 matches (only useful once there's
 *     a chat history to sample).
 *   - Weekly Top 10 needs ≥ 7 days of behaviour history to be signal.
 *   - AI Match needs ≥ 3 matches so the ranker has calibration data.
 *   - Creativity Earn = onboarding complete (unfinished profiles first).
 *   - Vibe check = always available (v1: no gating; leaves the surface
 *     open for cold-start engagement).
 */
export function shouldShowFeature(user: DisclosureUser, feature: GatedFeature, now: Date = new Date()): boolean {
  const days = daysSinceSignup(user, now);
  const matches = user.matchCount ?? 0;

  switch (feature) {
    case 'dtm':
      // Panel: DTM (Date-to-Marry) is emotionally heavy; users need to
      // have felt the app matches them at all before we ask them to sit
      // for a 20-question DTM intake. Threshold: ≥ 1 match OR the user
      // has explicitly opted in to seriousMode.
      return matches >= 1 || user.seriousModeEnabled;

    case 'family-brief':
      // Panel: Family Brief is the "share your PDF with parents" surface.
      // It only makes sense once the user has picked intent=serious (or
      // dtm), because that's when they'd want a family-facing view.
      return user.intent === 'serious' || user.intent === 'dtm';

    case 'anti-ghost':
      // Panel: anti-ghost nudges only trigger on stalled chats — you
      // need conversation history to nudge. Gate on ≥ 3 matches.
      return matches >= 3;

    case 'weekly-top-10':
      // Panel: weekly top-10 needs a week of behavioural signal to be
      // more than random. Gate on ≥ 7 days since signup.
      return days >= 7;

    case 'ai-match':
      // Panel: AI Match ranks the top-1 daily candidate. Needs ≥ 3
      // matches so the personalization has calibration data.
      return matches >= 3;

    case 'creativity-earn':
      // Panel: the creativity-earn drawer nudges profile completion
      // via a Spotlight ledger reward. Hide until the user has NOT
      // finished onboarding — showing it after is just noise.
      return !user.onboardingComplete;

    case 'vibe-check':
      // Panel: no gating — the vibe check is a shallow, delightful
      // cold-start engagement surface; always available.
      return true;

    default: {
      // TypeScript-exhaustive default — the switch already covers every
      // GatedFeature. If a new one is added and this default fires,
      // return false (hide) to be conservative.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _exhaustive: never = feature;
      return false;
    }
  }
}

/**
 * isProgressiveDisclosureEnabled — reads the client-side flag.
 *
 * Off (default) means the layout skips every gate call and every feature is
 * always visible (v1 bit-identical behaviour). On means the layout applies
 * `shouldShowFeature` per gated nav item.
 */
export function isProgressiveDisclosureEnabled(env?: Record<string, string | undefined>): boolean {
  const src = env ?? (typeof process !== 'undefined' ? process.env : {});
  // Both server-side and client-side flags are respected; the NEXT_PUBLIC_
  // variant is what gets baked into the client bundle, but tests + SSR
  // paths use the bare name.
  return src.NEXT_PUBLIC_FEATURE_PROGRESSIVE_DISCLOSURE_ENABLED === '1'
    || src.FEATURE_PROGRESSIVE_DISCLOSURE_ENABLED === '1';
}

/**
 * Map from nav-item href → gated feature key. If a href isn't in this map
 * the nav item is unconditionally visible (like Discover, Messages, Search).
 * The layout uses this table so the disclosure rules stay authoritative in
 * one place and future nav additions can wire a gate with a one-line entry.
 *
 * Task 1a wire-list: DTM (/serious-mode + /dtm), Weekly Top-10 (/matches
 * subview but no top-level nav row yet — future placement), Family Brief
 * (/serious-mode child; hidden alongside serious-mode), AI Match, Vibe
 * Check, Creativity.
 */
export const NAV_HREF_GATE: Record<string, GatedFeature> = {
  '/serious-mode': 'dtm',
  '/dtm': 'dtm',
  '/family-brief': 'family-brief',
  '/ai-match': 'ai-match',
  '/vibe-check': 'vibe-check',
  '/creativity': 'creativity-earn',
};

/**
 * filterNavByDisclosure — the layout helper.
 *
 * When the flag is OFF (or user is null) returns `items` untouched (v1
 * bit-identical). When ON, filters out any item whose href maps to a gated
 * feature that `shouldShowFeature` reports as hidden.
 */
export function filterNavByDisclosure<T extends { href: string }>(
  items: readonly T[],
  user: DisclosureUser | null,
  opts: { enabled?: boolean; now?: Date } = {},
): T[] {
  if (!opts.enabled || !user) return items.slice();
  const now = opts.now ?? new Date();
  return items.filter((item) => {
    const gate = NAV_HREF_GATE[item.href];
    if (!gate) return true;
    return shouldShowFeature(user, gate, now);
  });
}
