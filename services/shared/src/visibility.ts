// ─── v3.2 Profile Field Visibility ────────────────────────────
// Declarative map of which fields on each profile shape are visible to
// whom. Three tiers:
//   • PUBLIC          — shown in discover cards & open-profile reads.
//   • MATCHES_ONLY    — revealed only after a Match row exists.
//   • REQUEST_ACCESS  — gated by an AccessRequest with status='approved'.
//
// Callers pass the viewer's relationship to the target and `redactProfile`
// returns a copy with non-permitted fields stripped (set to undefined so
// downstream serializers can drop them).
//
// Apply at every "other-user" read site (discover detail, search hit, etc).
// `viewerRel === 'self'` is always full visibility.

export type Visibility = 'PUBLIC' | 'MATCHES_ONLY' | 'REQUEST_ACCESS';
export type ViewerRel = 'self' | 'match' | 'access' | 'public';
// 'access' implies the viewer has at least one approved AccessRequest for
// one or more fields; the caller computes the per-field grant set and passes
// it as `grants` to `redactProfile`.

// ─── Casual / Discover profile ───────────────────────────────
// Every field on the casual profile is PUBLIC by design — Discover is a
// public-facing surface. Listed here so any future "hide" toggle has a
// declarative home.
export const CASUAL_PROFILE_VISIBILITY: Record<string, Visibility> = {
  displayName: 'PUBLIC', age: 'PUBLIC', gender: 'PUBLIC', city: 'PUBLIC',
  profession: 'PUBLIC', bio: 'PUBLIC', avatarGradient: 'PUBLIC',
  height: 'PUBLIC', sexuality: 'PUBLIC', lookingFor: 'PUBLIC',
  smoking: 'PUBLIC', drinking: 'PUBLIC', exercise: 'PUBLIC',
  education: 'PUBLIC', religion: 'PUBLIC', zodiac: 'PUBLIC',
  languages: 'PUBLIC', pets: 'PUBLIC', children: 'PUBLIC',
  diet: 'PUBLIC', politicalViews: 'PUBLIC',
  // photos/prompts/interests are scoped at the relation read site.
};

// ─── DTM / MatrimonialProfile ────────────────────────────────
// PUBLIC headline; everything personal-financial-family is gated.
export const DTM_PROFILE_VISIBILITY: Record<string, Visibility> = {
  // PUBLIC headline
  fullName: 'PUBLIC',
  dateOfBirth: 'PUBLIC', height: 'PUBLIC', complexion: 'PUBLIC', bodyType: 'PUBLIC',
  religion: 'PUBLIC', caste: 'PUBLIC', subCaste: 'PUBLIC', manglik: 'PUBLIC',
  motherTongue: 'PUBLIC', maritalStatus: 'PUBLIC',
  education: 'PUBLIC', educationDetail: 'PUBLIC',
  occupation: 'PUBLIC', workingCity: 'PUBLIC', workingCountry: 'PUBLIC',
  diet: 'PUBLIC', smoking: 'PUBLIC', drinking: 'PUBLIC',
  aboutMe: 'PUBLIC',

  // MATCHES_ONLY — revealed after a Match
  college: 'MATCHES_ONLY',
  company: 'MATCHES_ONLY', annualIncome: 'MATCHES_ONLY',
  fatherName: 'MATCHES_ONLY', fatherOccupation: 'MATCHES_ONLY',
  motherName: 'MATCHES_ONLY', motherOccupation: 'MATCHES_ONLY',
  brothers: 'MATCHES_ONLY', brothersMarried: 'MATCHES_ONLY',
  sisters: 'MATCHES_ONLY', sistersMarried: 'MATCHES_ONLY',
  familyType: 'MATCHES_ONLY', familyStatus: 'MATCHES_ONLY',
  familyValues: 'MATCHES_ONLY', familyIncome: 'MATCHES_ONLY',
  nativePlace: 'MATCHES_ONLY',
  aboutFamily: 'MATCHES_ONLY',
  partnerAgeMin: 'MATCHES_ONLY', partnerAgeMax: 'MATCHES_ONLY',
  partnerHeightMin: 'MATCHES_ONLY', partnerHeightMax: 'MATCHES_ONLY',
  partnerReligion: 'MATCHES_ONLY', partnerCaste: 'MATCHES_ONLY',
  partnerEducation: 'MATCHES_ONLY', partnerOccupation: 'MATCHES_ONLY',
  partnerIncome: 'MATCHES_ONLY', partnerCity: 'MATCHES_ONLY',
  partnerManglik: 'MATCHES_ONLY', partnerMaritalStatus: 'MATCHES_ONLY',
  partnerMotherTongue: 'MATCHES_ONLY', partnerDiet: 'MATCHES_ONLY',
  partnerExpectation: 'MATCHES_ONLY',

  // REQUEST_ACCESS — astrological / verification artifacts
  birthTime: 'REQUEST_ACCESS', birthPlace: 'REQUEST_ACCESS',
  gotra: 'REQUEST_ACCESS', star: 'REQUEST_ACCESS', raasi: 'REQUEST_ACCESS',
  dosham: 'REQUEST_ACCESS', nakshatra: 'REQUEST_ACCESS',
  kundliUrl: 'REQUEST_ACCESS', kundliData: 'REQUEST_ACCESS',
  numerologyNumber: 'REQUEST_ACCESS', destinyNumber: 'REQUEST_ACCESS',
  soulNumber: 'REQUEST_ACCESS', horoscopeMatch: 'REQUEST_ACCESS',
  bloodGroup: 'REQUEST_ACCESS', weight: 'REQUEST_ACCESS',
  physicalStatus: 'REQUEST_ACCESS',
};

export interface RedactOptions {
  viewerRel: ViewerRel;
  grants?: Set<string>; // field keys granted via AccessRequest.approved
}

function isAllowed(vis: Visibility, opts: RedactOptions, fieldKey?: string): boolean {
  if (opts.viewerRel === 'self') return true;
  if (vis === 'PUBLIC') return true;
  if (vis === 'MATCHES_ONLY') return opts.viewerRel === 'match' || opts.viewerRel === 'access';
  if (vis === 'REQUEST_ACCESS') {
    // matches still don't see request-access fields without an approved grant
    if (fieldKey && opts.grants?.has(fieldKey)) return true;
    return false;
  }
  return false;
}

/**
 * Return a copy of `profile` with disallowed fields replaced by `undefined`.
 * Pass `kind: 'casual'` for a Profile row or `'dtm'` for a MatrimonialProfile row.
 */
export function redactProfile<T extends Record<string, any>>(
  profile: T | null,
  kind: 'casual' | 'dtm',
  opts: RedactOptions,
): T | null {
  if (!profile) return profile;
  const map = kind === 'dtm' ? DTM_PROFILE_VISIBILITY : CASUAL_PROFILE_VISIBILITY;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(profile)) {
    const vis = map[k];
    if (!vis) { out[k] = v; continue; }              // unknown key → pass-through (id, userId, timestamps)
    if (isAllowed(vis, opts, k)) out[k] = v;
    else out[k] = undefined;
  }
  return out as T;
}

/**
 * Return the visibility tier of a single field — useful for the onboarding UI
 * to render a "who sees this" badge on every input.
 */
export function fieldVisibility(kind: 'casual' | 'dtm', field: string): Visibility | undefined {
  const map = kind === 'dtm' ? DTM_PROFILE_VISIBILITY : CASUAL_PROFILE_VISIBILITY;
  return map[field];
}
