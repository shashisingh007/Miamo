// ─── Public-user projection ────────────────────────────────────
// Every service that surfaces "another user" (Discover, AI-match, Feed
// authors, Story authors, Message senders, Chat participants, Matches,
// Creativity/Showcase authors, Matrimonial candidates, …) previously
// handed back the full User row minus `passwordHash`. That leaked:
//   email, phone, googleId, appleId, twoFactorEnabled, isAdmin,
//   emailVerified, phoneVerified, premiumUntil, deactivated,
//   authProvider, createdAt, updatedAt
// which lets any authenticated user scrape everyone else's email/phone
// with a Discover swipe loop. This helper strips all sensitive fields;
// route it through EVERY route that returns another user.
//
// Preserved public fields (safe for cross-user reads):
//   id, displayName, username, miamoId, verified, active, premium,
//   profileScore, avatar (photo url), profile (Profile row — separately
//   scoped), photos, prompts, interests, matrimonialProfile if included
//
// Callers should pass the object AFTER any Prisma `include` — this
// walks nested objects (profile, photos, matrimonialProfile) and leaves
// them untouched.

export interface UserPublicOptions {
  /** If true, strip `active` / `premium` too — used for public non-authed
   *  reads (guest visitors etc.). Default: keep them since they're
   *  UI-visible signals. */
  strictly?: boolean;
}

// Every key on the User model that we must NEVER emit to another user.
export const USER_PII_FIELDS = [
  'email',
  'phone',
  'passwordHash',
  'googleId',
  'appleId',
  'twoFactorEnabled',
  'authProvider',
  'isAdmin',
  'emailVerified',
  'phoneVerified',
  'premiumUntil',
  'deactivated',
  'createdAt',
  'updatedAt',
  'devicePlatform',
  'lastPasswordChangeAt',
] as const;

const PII_SET = new Set<string>(USER_PII_FIELDS as unknown as string[]);

/**
 * Return a shallow-cloned copy of `user` with sensitive fields removed.
 * Nested `profile`, `photos`, `prompts`, `interests`, `matrimonialProfile`
 * are passed through unchanged (they're separate rows with their own
 * privacy semantics — Profile is meant to be public, MatrimonialProfile
 * has BioDataAccessRequest gating handled elsewhere).
 */
export function toPublicUser<T extends Record<string, unknown> | null | undefined>(
  user: T,
  _opts?: UserPublicOptions,
): T {
  if (!user || typeof user !== 'object') return user;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(user)) {
    if (PII_SET.has(k)) continue;
    out[k] = v;
  }
  return out as T;
}

/** Bulk variant for lists (Discover result set, feed authors, etc.). */
export function toPublicUsers<T extends Record<string, unknown>>(
  users: T[] | null | undefined,
  opts?: UserPublicOptions,
): T[] {
  if (!Array.isArray(users)) return [];
  return users.map((u) => toPublicUser(u, opts));
}

/**
 * Helper for the very common "row that includes an `author` field pointing
 * at a User" shape (Feed post, Story, Video, Creativity item, Comment, …).
 * Returns a new object with `.author` scrubbed. If the input has no
 * `author` key, returns the row unchanged.
 */
export function withPublicAuthor<T extends { author?: unknown }>(
  row: T,
  opts?: UserPublicOptions,
): T {
  if (!row || typeof row !== 'object' || !('author' in row)) return row;
  const author = (row as Record<string, unknown>).author;
  if (!author || typeof author !== 'object') return row;
  return { ...row, author: toPublicUser(author as Record<string, unknown>, opts) };
}
