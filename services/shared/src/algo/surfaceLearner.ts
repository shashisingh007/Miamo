/**
 * Surface-aware learner extensions — V7 phase D pure-module slice.
 *
 * Adds a minimal `surface` discriminator so the same `UserWeightProfile`
 * type can serve both the Discover learner and the DTM learner without a
 * schema split (that lives behind a follow-up prisma migration).
 *
 * Pure: no DB. Caller persists `surface` alongside the row.
 */
import type { UserWeightProfile } from './learner';
import type { ContextualRewardSample } from './contextAwareRewards';

export type LearnerSurface = 'discover' | 'dtm';

export type SurfaceProfile = UserWeightProfile & {
  /** Identifies which surface the profile belongs to. */
  surface: LearnerSurface;
};

/**
 * Tag a generic profile with a surface. Pure: returns a new object.
 */
export function withSurface(
  p: UserWeightProfile,
  surface: LearnerSurface,
): SurfaceProfile {
  return { ...p, surface };
}

/**
 * Split a list of contextual reward samples into per-surface buckets.
 * Samples whose surface is empty / unknown go to `unknown` so the caller
 * can decide whether to drop them or attribute to a default surface.
 */
export function splitBySurface(samples: ContextualRewardSample[]): {
  discover: ContextualRewardSample[];
  dtm: ContextualRewardSample[];
  unknown: ContextualRewardSample[];
} {
  const out = {
    discover: [] as ContextualRewardSample[],
    dtm: [] as ContextualRewardSample[],
    unknown: [] as ContextualRewardSample[],
  };
  for (const s of samples) {
    if (s.surface === 'discover') out.discover.push(s);
    else if (s.surface === 'dtm') out.dtm.push(s);
    else out.unknown.push(s);
  }
  return out;
}

/**
 * Surface-specific decay half-life. Discover taste shifts faster (events are
 * cheap and frequent); DTM answers are deliberate so older preferences age
 * more slowly.
 */
export const HALF_LIFE_DAYS: Record<LearnerSurface, number> = {
  discover: 14,
  dtm: 30,
};
